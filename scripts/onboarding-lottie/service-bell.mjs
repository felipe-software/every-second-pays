import { writeFileSync } from "node:fs";

import { getThemeColors } from "../../src/features/appearance/palettes.ts";
import { ALLOWED, BELL_CUES, COIN, COIN_EVERY, DECLINED, ENTER } from "../../src/features/onboarding/bell-timeline.ts";

const OUTPUT = new URL("../../src/assets/onboarding/notifications.json", import.meta.url);
const FPS = 60;
const frames = (ms) => Math.round((ms * FPS) / 1000);

const LOOP = [frames(ENTER), frames(ENTER) + frames(COIN_EVERY) * 2];
const ALLOW = [LOOP[1] + 1, LOOP[1] + 1 + frames(ALLOWED.length)];
const DECLINE = [ALLOW[1] + 1, ALLOW[1] + 1 + frames(DECLINED.length)];
const LAST = DECLINE[1] + 1;

const HIT = COIN.hit / 1000;
const BOUNCE = COIN.bounce / 1000;
const HOP = COIN.hop / 1000;
const GONE = COIN.gone / 1000;
const ALLOWED_HITS = ALLOWED.coins.map((offset) => offset / 1000 + HIT);
const LAND = DECLINED.land / 1000;
const SETTLE = DECLINED.settle / 1000;

const BELL_X = 206;
const BELL_Y = 405;
const COIN_TOP = BELL_Y - 185;
const COIN_REST = BELL_Y + 9;
const RINGS_Y = BELL_Y - 58;
const COIN_SCALE = 0.9;

const clamp = (value, from = 0, to = 1) => Math.min(to, Math.max(from, value));
const seg = (time, from, to) => clamp((time - from) / (to - from));
const mix = (from, to, amount) => from + (to - from) * amount;
const easeOut = (amount) => 1 - (1 - amount) ** 3;
const spring = (amount) => (amount <= 0 ? 0 : amount >= 1 ? 1 : 1 - Math.exp(-5.5 * amount) * Math.cos(Math.PI * 2 * 1.7 * amount));

function moment(frame) {
    if (frame < LOOP[0]) return { scene: "enter", time: frame / FPS };
    if (frame <= LOOP[1]) return { scene: "ask", time: (frame - LOOP[0]) / FPS };
    if (frame <= ALLOW[1]) return { scene: "allowed", time: (frame - ALLOW[0]) / FPS };
    return { scene: "declined", time: (frame - DECLINE[0]) / FPS };
}

function sinceHit({ scene, time }) {
    if (scene === "ask") {
        const since = (time % (COIN_EVERY / 1000)) - HIT;
        return since > 0 ? since : Infinity;
    }
    if (scene === "allowed") {
        const passed = ALLOWED_HITS.filter((hit) => hit <= time);
        return passed.length ? time - passed.at(-1) : Infinity;
    }
    return Infinity;
}

function press({ scene, time }) {
    if (scene !== "declined" || time < LAND) return 0;
    const since = time - LAND;
    return since < SETTLE ? 5 * Math.sin((Math.PI * since) / SETTLE) + (3 * since) / SETTLE : 3;
}

function bell(frame) {
    const now = moment(frame);
    const entered = now.scene === "enter" ? spring(seg(now.time, 0, ENTER / 1000)) : 1;
    const shown = now.scene === "enter" ? seg(now.time, 0, 0.15) : 1;
    const since = sinceHit(now);
    const decay = Number.isFinite(since);
    const squash = decay && since < 0.2 ? Math.sin((Math.PI * since) / 0.2) * 0.05 : 0;
    const tremble = decay ? 1.6 * Math.sin(since * 50) * Math.exp(-since * 7) : 0;
    const scale = mix(0.7, 1, entered);
    return {
        base: { x: BELL_X, y: BELL_Y, sx: scale, sy: scale, o: shown },
        plunger: { x: BELL_X, y: BELL_Y + (decay ? 12 * Math.exp(-since * 9) : 0) + press(now), r: tremble, sx: scale, sy: scale, o: shown },
        dome: { x: BELL_X, y: BELL_Y, r: tremble, sx: scale * (1 + squash * 0.6), sy: scale * (1 - squash), o: shown },
    };
}

function rings(frame) {
    const since = sinceHit(moment(frame));
    const progress = Number.isFinite(since) ? (since - 0.02) / 0.55 : Infinity;
    const scale = mix(0.86, 1.12, easeOut(clamp(progress)));
    return { x: BELL_X, y: RINGS_Y, sx: scale, sy: scale, o: progress > 0 && progress < 1 ? (1 - progress) * 0.9 : 0 };
}

function glow(frame) {
    const now = moment(frame);
    const since = sinceHit(now);
    const pulse = Number.isFinite(since) ? (since - 0.02) / 0.55 : Infinity;
    let opacity = 0.14 + 0.12 * (pulse > 0 && pulse < 1 ? 1 - pulse : 0);
    if (now.scene === "enter") opacity = 0.14 * seg(now.time, 0, 0.3);
    if (now.scene === "allowed" && now.time >= HIT) opacity = 0.2 + 0.6 * Math.exp(-(now.time - HIT) * 1.7);
    if (now.scene === "declined") opacity = mix(0.14, 0.05, seg(now.time, 0, 0.5));
    return { x: 0, y: 0, o: opacity };
}

function coinFlight(time, direction) {
    if (time < HIT) {
        const fall = time / HIT;
        return { x: BELL_X, y: -60 + (COIN_TOP + 60) * fall * fall, r: fall * 120 };
    }
    if (time < BOUNCE) {
        const arc = (time - HIT) / (BOUNCE - HIT);
        return {
            x: BELL_X + direction * 160 * arc,
            y: COIN_TOP + (COIN_REST - COIN_TOP) * arc * arc - 110 * Math.sin(Math.PI * arc),
            r: 120 + direction * 280 * arc,
        };
    }
    if (time < HOP) {
        const hop = (time - BOUNCE) / (HOP - BOUNCE);
        return { x: BELL_X + direction * (160 + 34 * hop), y: COIN_REST - 24 * Math.sin(Math.PI * hop), r: 120 + direction * (280 + 90 * hop) };
    }
    const roll = (time - HOP) / (GONE - HOP);
    return { x: BELL_X + direction * (194 + 70 * roll), y: COIN_REST, r: 120 + direction * (370 + 150 * roll) };
}

function restingCoin(time) {
    if (time < LAND) {
        const fall = time / LAND;
        return { x: BELL_X, y: -60 + (COIN_TOP + 60) * fall * fall, r: fall * 70 };
    }
    const since = time - LAND;
    return {
        x: BELL_X,
        y: COIN_TOP - 15 * Math.max(0, Math.sin(Math.PI * seg(since, 0, SETTLE))),
        r: 70 + (14 - 70) * easeOut(seg(since, 0, SETTLE)) + 7 * Math.sin(since * 15) * Math.exp(-since * 4.5),
    };
}

function particles() {
    let seed = 71;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    return Array.from({ length: 14 }, (_, index) => {
        const angle = -Math.PI / 2 + (random() - 0.5) * 2.7;
        const speed = 240 + random() * 360;
        return {
            asset: index % 3 ? "coin" : "bill",
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            spin: (random() - 0.5) * 700,
            scale: index % 3 ? 0.3 + random() * 0.2 : 0.8 + random() * 0.4,
        };
    });
}

const round = (value) => Math.round(value * 1000) / 1000;

function simplify(points, tolerance) {
    if (points.length < 3) return points;
    const [first, last] = [points[0], points.at(-1)];
    let far = -1;
    let distance = tolerance;
    for (let index = 1; index < points.length - 1; index += 1) {
        const [time, value] = points[index];
        const line = first[1] + ((last[1] - first[1]) * (time - first[0])) / (last[0] - first[0]);
        if (Math.abs(value - line) > distance) {
            distance = Math.abs(value - line);
            far = index;
        }
    }
    if (far < 0) return [first, last];
    return [...simplify(points.slice(0, far + 1), tolerance).slice(0, -1), ...simplify(points.slice(far), tolerance)];
}

const LINEAR = { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };

function channel(samples, tolerance) {
    const points = simplify(samples, tolerance);
    const moving = points.some(([, value]) => Math.abs(value - points[0][1]) > tolerance);
    if (!moving) return { a: 0, k: round(points[0][1]) };
    return { a: 1, k: points.map(([time, value]) => ({ t: time, s: [round(value)], ...LINEAR })) };
}

function scaleChannel(xs, ys) {
    const keep = new Set([...simplify(xs, 0.1), ...simplify(ys, 0.1)].map(([time]) => time));
    const keyed = xs.flatMap(([time, x], index) => (keep.has(time) ? [{ t: time, s: [round(x), round(ys[index][1]), 100], ...LINEAR }] : []));
    const still = keyed.every((key) => key.s[0] === keyed[0].s[0] && key.s[1] === keyed[0].s[1]);
    return still ? { a: 0, k: keyed[0].s } : { a: 1, k: keyed };
}

function transform(pose, from, to, anchor = [0, 0]) {
    const samples = [];
    for (let frame = from; frame <= to; frame += 1) samples.push([frame, { r: 0, sx: 1, sy: 1, o: 1, ...pose(frame) }]);
    const take = (read) => samples.map(([frame, value]) => [frame, read(value)]);
    return {
        o: channel(take((value) => clamp(value.o) * 100), 0.3),
        r: channel(take((value) => value.r), 0.1),
        p: { s: true, x: channel(take((value) => value.x), 0.05), y: channel(take((value) => value.y), 0.05) },
        a: { a: 0, k: [...anchor, 0] },
        s: scaleChannel(take((value) => value.sx * 100), take((value) => value.sy * 100)),
    };
}

const color = (value) => (value.length === 7 ? [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16) / 255).concat(1).map(round) : value);
const still = (k) => ({ a: 0, k });
const IDENTITY = { ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) };

const PARAMS = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, A: 7, Z: 0 };

function arcToCubics(x0, y0, rx, ry, largeArc, sweep, x1, y1) {
    const dx = (x0 - x1) / 2;
    const dy = (y0 - y1) / 2;
    const scale = Math.max(1, Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)));
    const [a, b] = [rx * scale, ry * scale];
    const sign = largeArc === sweep ? -1 : 1;
    const ratio = sign * Math.sqrt(Math.max(0, (a * a * b * b - a * a * dy * dy - b * b * dx * dx) / (a * a * dy * dy + b * b * dx * dx)));
    const cx = (ratio * a * dy) / b + (x0 + x1) / 2;
    const cy = (-ratio * b * dx) / a + (y0 + y1) / 2;
    const start = Math.atan2((y0 - cy) / b, (x0 - cx) / a);
    let delta = Math.atan2((y1 - cy) / b, (x1 - cx) / a) - start;
    if (sweep && delta < 0) delta += Math.PI * 2;
    if (!sweep && delta > 0) delta -= Math.PI * 2;
    const parts = Math.ceil(Math.abs(delta) / (Math.PI / 2));
    const handle = (4 / 3) * Math.tan(delta / parts / 4);
    return Array.from({ length: parts }, (_, index) => {
        const [from, to] = [start + (index * delta) / parts, start + ((index + 1) * delta) / parts];
        const point = (angle) => [cx + a * Math.cos(angle), cy + b * Math.sin(angle)];
        const [px, py] = point(from);
        const [qx, qy] = point(to);
        return [px - handle * a * Math.sin(from), py + handle * b * Math.cos(from), qx + handle * a * Math.sin(to), qy - handle * b * Math.cos(to), qx, qy];
    });
}

function contours(d, { scale = 1, x = 0, y = 0 } = {}) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g);
    const result = [];
    let contour;
    let [cx, cy] = [0, 0];
    let index = 0;
    let command;
    const number = () => Number(tokens[index++]);
    const add = ([px, py]) => {
        contour.v.push([px, py]);
        contour.i.push([0, 0]);
        contour.o.push([0, 0]);
        [cx, cy] = [px, py];
    };
    const curve = (c1x, c1y, c2x, c2y, px, py) => {
        contour.o[contour.o.length - 1] = [c1x - cx, c1y - cy];
        add([px, py]);
        contour.i[contour.i.length - 1] = [c2x - px, c2y - py];
    };
    while (index < tokens.length) {
        if (/[a-zA-Z]/.test(tokens[index])) command = tokens[index++];
        const upper = command.toUpperCase();
        const [ox, oy] = command === upper ? [0, 0] : [cx, cy];
        if (upper === "Z") {
            const last = contour.v.length - 1;
            if (Math.hypot(contour.v[last][0] - contour.v[0][0], contour.v[last][1] - contour.v[0][1]) < 0.01) {
                contour.i[0] = contour.i[last];
                contour.v.pop();
                contour.i.pop();
                contour.o.pop();
            }
            contour.c = true;
            result.push(contour);
            [cx, cy] = contour.v[0];
            contour = undefined;
            continue;
        }
        const count = PARAMS[upper];
        if (!count) throw new Error(`Unsupported path command ${command}`);
        if (upper === "M") {
            if (contour) result.push(contour);
            contour = { c: false, v: [], i: [], o: [] };
            add([ox + number(), oy + number()]);
            command = command === "M" ? "L" : "l";
        } else if (upper === "L") add([ox + number(), oy + number()]);
        else if (upper === "H") add([ox + number(), cy]);
        else if (upper === "V") add([cx, oy + number()]);
        else if (upper === "C") curve(ox + number(), oy + number(), ox + number(), oy + number(), ox + number(), oy + number());
        else if (upper === "Q") {
            const [qx, qy, px, py] = [ox + number(), oy + number(), ox + number(), oy + number()];
            curve(cx + ((qx - cx) * 2) / 3, cy + ((qy - cy) * 2) / 3, px + ((qx - px) * 2) / 3, py + ((qy - py) * 2) / 3, px, py);
        } else {
            const [rx, ry] = [number(), number()];
            number();
            const [large, sweep, px, py] = [number(), number(), ox + number(), oy + number()];
            for (const cubic of arcToCubics(cx, cy, rx, ry, large === 1, sweep === 1, px, py)) curve(...cubic);
        }
    }
    if (contour) result.push(contour);
    return result.map((shape) => ({
        c: shape.c,
        v: shape.v.map(([px, py]) => [round(px * scale + x), round(py * scale + y)]),
        i: shape.i.map(([px, py]) => [round(px * scale), round(py * scale)]),
        o: shape.o.map(([px, py]) => [round(px * scale), round(py * scale)]),
    }));
}

const path = (d, placement) => contours(d, placement).map((shape) => ({ ty: "sh", ks: still(shape) }));
const ellipse = (rx, ry = rx, cx = 0, cy = 0) => [{ ty: "el", p: still([cx, cy]), s: still([rx * 2, ry * 2]) }];
const rect = (x, y, w, h, r = 0) => [{ ty: "rc", p: still([x + w / 2, y + h / 2]), s: still([w, h]), r: still(r) }];

function paint(shapes, { fill, stroke, width = 1, opacity = 100 }) {
    const items = [...shapes];
    if (stroke) items.push({ ty: "st", c: still(color(stroke)), o: still(100), w: still(width), lc: 2, lj: 2, ml: 4 });
    if (fill) items.push({ ty: "fl", c: still(color(fill)), o: still(opacity), r: 1 });
    return { ty: "gr", it: [...items, IDENTITY] };
}

const DOLLAR = "M308 53L251 53L251-730L308-730L308 53ZM277-68L277-68Q222-68 178-80Q134-92 103-113.5Q72-135 55.5-165Q39-195 39-233L39-233Q39-237 39-241Q39-245 40-247L40-247L174-247Q174-245 174-243Q174-241 174-239L174-239Q175-214 190-198.5Q205-183 229.5-176Q254-169 281-169L281-169Q305-169 327.5-173.5Q350-178 365.5-190Q381-202 381-221L381-221Q381-245 361.5-258Q342-271 310.5-279Q279-287 242-297L242-297Q208-305 174-315.5Q140-326 112.5-343Q85-360 68-387.5Q51-415 51-457L51-457Q51-498 69-528.5Q87-559 118.5-579Q150-599 192.5-608.5Q235-618 284-618L284-618Q330-618 370-608.5Q410-599 440-580.5Q470-562 487-534.5Q504-507 504-473L504-473Q504-466 504-460Q504-454 503-452L503-452L370-452L370-460Q370-478 359-490.5Q348-503 327.5-510Q307-517 278-517L278-517Q258-517 241.5-514Q225-511 213-505Q201-499 194.5-490.5Q188-482 188-470L188-470Q188-453 202.5-442.5Q217-432 241-425Q265-418 294-410L294-410Q330-400 369.5-390.5Q409-381 443-365Q477-349 498-319.5Q519-290 519-240L519-240Q519-192 500.5-159Q482-126 449-106Q416-86 372-77Q328-68 277-68Z";
const DOLLAR_ADVANCE = 556;
const dollar = (size, x, baseline) => path(DOLLAR, { scale: size / 1000, x: x - (DOLLAR_ADVANCE * size) / 2000, y: baseline });

const COIN_ART = [
    paint(ellipse(30), { fill: "#FFCC4D", stroke: "#C98A1E", width: 3.5 }),
    paint(ellipse(23), { stroke: "#E8A93A", width: 2.5 }),
    paint(dollar(30, 0, 10.5), { fill: "#93661D" }),
    paint(path("M-19-13A23 23 0 0 1-7-21"), { stroke: "#FFF0C2", width: 3.5 }),
];
const BILL_ART = [
    paint(rect(-34, -11, 68, 33, 7), { fill: "#D9EDC9", stroke: "#6FA94E", width: 1.8 }),
    paint(rect(-34, -18, 68, 33, 7), { fill: "#A7D28B", stroke: "#6FA94E", width: 1.8 }),
    paint(dollar(13, -23, -3), { fill: "#5C913B" }),
    paint(rect(-11, -21, 22, 36), { fill: "#FFE8B6", stroke: "#F3D393", width: 0.9 }),
    paint(ellipse(5.5, 5.5, 23, -2.5), { fill: "#77B255" }),
];
const BASE_ART = [
    paint(ellipse(146, 11, 0, 44), { fill: "#000000", opacity: 16 }),
    paint(path("M-128 14V26A128 16 0 0 0 128 26V14Z"), { fill: "#9A5B38", stroke: "#6E3F22", width: 4 }),
    paint(ellipse(128, 16, 0, 14), { fill: "#C98558", stroke: "#6E3F22", width: 4 }),
    paint(ellipse(108, 11, 0, 9), { fill: "#6E3F22" }),
];
const DOME_ART = [
    paint(path("M-112-2A112 112 0 0 1 112-2A112 15 0 0 1-112-2Z"), { fill: "#FFCC4D", stroke: "#D9932A", width: 5 }),
    paint(path("M40-106A112 112 0 0 1 110-14C102-11 90-9 76-8 88-46 76-82 40-106Z"), { fill: "#FFB52E" }),
    paint(path("M-104-16A104 12 0 0 0 104-16"), { stroke: "#F09E1B", width: 7 }),
    paint(path("M-74-60C-64-78-50-90-30-97"), { stroke: "#FFF0C2", width: 12 }),
];
const PLUNGER_ART = [
    paint(rect(-9, -134, 18, 26), { fill: "#D9932A", stroke: "#B87A1F", width: 2 }),
    paint(path("M-27-136C-27-152-13-158 0-158 13-158 27-152 27-136 27-128-27-128-27-136Z"), { fill: "#FFCC4D", stroke: "#D9932A", width: 4 }),
    paint(path("M-14-146C-10-150-6-151-2-152"), { stroke: "#FFF0C2", width: 4 }),
];
const arc = (side, radius) => {
    const x = side * radius * Math.cos(0.62);
    const y = radius * Math.sin(0.62);
    return `M${x} ${-y}A${radius} ${radius} 0 0 ${side > 0 ? 1 : 0} ${x} ${y}`;
};
const RING_ART = [1, -1].flatMap((side) => [150, 178].map((radius) => paint(path(arc(side, radius)), { stroke: "#0", width: 7 })));
const CHECK_ART = [paint(ellipse(24), { fill: "#0" }), paint(path("M-11 1-3 9 12-8"), { stroke: "#1", width: 5.5 })];
const GLOW_ART = [{
    ty: "gr",
    it: [
        ...ellipse(240, 240, BELL_X, RINGS_Y - 10),
        { ty: "gf", o: still(100), r: 1, t: 2, s: still([BELL_X, RINGS_Y - 10]), e: still([BELL_X + 240, RINGS_Y - 10]), g: { p: 2, k: still("#2") } },
        IDENTITY,
    ],
}];

let nextIndex = 1;
const shapeLayer = (art, ks, from, to) => ({ ty: 4, ind: nextIndex++, ip: from, op: to + 1, st: 0, ks, shapes: [...art].reverse() });
const STATIC_KS = (x, y) => ({ o: still(100), r: still(0), p: still([x, y, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]) });
const asset = (id, w, h, art) => ({ id, w, h, layers: [{ ty: 4, ind: 1, ip: 0, op: LAST, st: 0, ks: STATIC_KS(w / 2, h / 2), shapes: [...art].reverse() }] });
const ASSET_SIZE = { coin: [80, 80], bill: [90, 60] };
const sprite = (id, pose, from, to) => {
    const [w, h] = ASSET_SIZE[id];
    return { ty: 0, refId: id, w, h, ind: nextIndex++, ip: from, op: to + 1, st: 0, ks: transform(pose, from, to, [w / 2, h / 2]) };
};

const coinPose = (start, direction) => (frame) => ({ ...coinFlight((frame - start) / FPS, direction), sx: COIN_SCALE, sy: COIN_SCALE });
const flyingCoin = (start, direction) => sprite("coin", coinPose(start, direction), start, start + frames(COIN.gone));

const askCoins = [flyingCoin(LOOP[0], -1), flyingCoin(LOOP[0] + frames(COIN_EVERY), 1)];
const allowedCoins = ALLOWED.coins.map((offset, index) => flyingCoin(ALLOW[0] + frames(offset), index % 2 ? 1 : -1));
const declinedCoin = sprite("coin", (frame) => ({ ...restingCoin((frame - DECLINE[0]) / FPS), sx: COIN_SCALE, sy: COIN_SCALE }), DECLINE[0], DECLINE[1]);

const burstStart = ALLOW[0] + frames(COIN.hit);
const burst = particles().map(({ asset: id, vx, vy, spin, scale }) => sprite(id, (frame) => {
    const time = (frame - burstStart) / FPS;
    return { x: BELL_X + vx * time, y: BELL_Y - 140 + vy * time + 640 * time * time, r: spin * time, sx: scale, sy: scale, o: 1 - seg(time, 0.8, 1.4) };
}, burstStart, burstStart + frames(1400)));

const check = shapeLayer(CHECK_ART, transform((frame) => {
    const shown = spring(seg((frame - ALLOW[0]) / FPS - HIT, 0.6, 1.2));
    return { x: BELL_X + 108, y: BELL_Y - 112, sx: shown, sy: shown, o: shown > 0 ? 1 : 0 };
}, ALLOW[0], ALLOW[1]), ALLOW[0], ALLOW[1]);

const whole = (read) => transform(read, 0, LAST - 1);
const layers = [
    check,
    ...burst,
    ...askCoins,
    ...allowedCoins,
    declinedCoin,
    shapeLayer(DOME_ART, whole((frame) => bell(frame).dome), 0, LAST - 1),
    shapeLayer(PLUNGER_ART, whole((frame) => bell(frame).plunger), 0, LAST - 1),
    shapeLayer(BASE_ART, whole((frame) => bell(frame).base), 0, LAST - 1),
    shapeLayer(RING_ART, whole(rings), 0, LAST - 1),
    shapeLayer(GLOW_ART, whole(glow), 0, LAST - 1),
];

const LOOKS = ["dark", "light"].flatMap((mode) => ["green", "orange", "blue", "rose", "lavender"].map((palette) => ({ palette, mode })));
const themed = (read) => LOOKS.map(({ palette, mode }) => read(getThemeColors(palette, mode === "dark")));
const stops = (accent) => {
    const [r, g, b] = color(accent);
    return [0, r, g, b, 1, r, g, b, 0, 0.55, 1, 0];
};

const moments = (name, starts) => starts.map((start) => ({ frame: start + frames(BELL_CUES[name]), name }));

writeFileSync(OUTPUT, `${JSON.stringify({
    animation: {
        v: "5.12.0",
        fr: FPS,
        ip: 0,
        op: LAST,
        w: 412,
        h: 915,
        nm: "notifications",
        ddd: 0,
        assets: [asset("coin", ...ASSET_SIZE.coin, COIN_ART), asset("bill", ...ASSET_SIZE.bill, BILL_ART)],
        layers,
    },
    tokens: [themed(({ accent }) => color(accent)), themed(({ canvas }) => color(canvas)), themed(({ accent }) => stops(accent))],
    looks: LOOKS.map(({ palette, mode }) => `${palette}-${mode}`),
    variants: {},
    segments: { intro: [0, LOOP[0]], loop: LOOP, allowed: ALLOW, declined: DECLINE },
    cues: [
        ...moments("enter", [0]),
        ...moments("ask", [LOOP[0], LOOP[0] + frames(COIN_EVERY)]),
        ...moments("allowed", [ALLOW[0]]),
        ...moments("declined", [DECLINE[0]]),
    ],
})}\n`);
