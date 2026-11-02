import { ALLOWED, COIN, COIN_EVERY, DECLINED, ENTER } from "../../src/features/onboarding/bell-timeline.ts";
import { clamp } from "./lottie-transform.mjs";

export const FPS = 60;
export const frames = (ms) => Math.round((ms * FPS) / 1000);

export const LOOP = [frames(ENTER), frames(ENTER) + frames(COIN_EVERY) * 2];
export const ALLOW = [LOOP[1] + 1, LOOP[1] + 1 + frames(ALLOWED.length)];
export const DECLINE = [ALLOW[1] + 1, ALLOW[1] + 1 + frames(DECLINED.length)];
export const LAST = DECLINE[1] + 1;

export const HIT = COIN.hit / 1000;
const BOUNCE = COIN.bounce / 1000;
const HOP = COIN.hop / 1000;
const GONE = COIN.gone / 1000;
const ALLOWED_HITS = ALLOWED.coins.map((offset) => offset / 1000 + HIT);
const LAND = DECLINED.land / 1000;
const SETTLE = DECLINED.settle / 1000;

export const BELL_X = 206;
export const BELL_Y = 405;
const COIN_TOP = BELL_Y - 185;
const COIN_REST = BELL_Y + 9;
export const RINGS_Y = BELL_Y - 58;
export const COIN_SCALE = 0.9;

export const seg = (time, from, to) => clamp((time - from) / (to - from));
const mix = (from, to, amount) => from + (to - from) * amount;
const easeOut = (amount) => 1 - (1 - amount) ** 3;

export function spring(amount) {
    if (amount <= 0) return 0;
    if (amount >= 1) return 1;
    return 1 - Math.exp(-5.5 * amount) * Math.cos(Math.PI * 2 * 1.7 * amount);
}

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

export function bell(frame) {
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
        plunger: {
            x: BELL_X,
            y: BELL_Y + (decay ? 12 * Math.exp(-since * 9) : 0) + press(now),
            r: tremble,
            sx: scale,
            sy: scale,
            o: shown,
        },
        dome: { x: BELL_X, y: BELL_Y, r: tremble, sx: scale * (1 + squash * 0.6), sy: scale * (1 - squash), o: shown },
    };
}

export function rings(frame) {
    const since = sinceHit(moment(frame));
    const progress = Number.isFinite(since) ? (since - 0.02) / 0.55 : Infinity;
    const scale = mix(0.86, 1.12, easeOut(clamp(progress)));
    return { x: BELL_X, y: RINGS_Y, sx: scale, sy: scale, o: progress > 0 && progress < 1 ? (1 - progress) * 0.9 : 0 };
}

export function glow(frame) {
    const now = moment(frame);
    const since = sinceHit(now);
    const pulse = Number.isFinite(since) ? (since - 0.02) / 0.55 : Infinity;
    let opacity = 0.14 + 0.12 * (pulse > 0 && pulse < 1 ? 1 - pulse : 0);
    if (now.scene === "enter") opacity = 0.14 * seg(now.time, 0, 0.3);
    if (now.scene === "allowed" && now.time >= HIT) opacity = 0.2 + 0.6 * Math.exp(-(now.time - HIT) * 1.7);
    if (now.scene === "declined") opacity = mix(0.14, 0.05, seg(now.time, 0, 0.5));
    return { x: 0, y: 0, o: opacity };
}

export function coinFlight(time, direction) {
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
        return {
            x: BELL_X + direction * (160 + 34 * hop),
            y: COIN_REST - 24 * Math.sin(Math.PI * hop),
            r: 120 + direction * (280 + 90 * hop),
        };
    }
    const roll = (time - HOP) / (GONE - HOP);
    return { x: BELL_X + direction * (194 + 70 * roll), y: COIN_REST, r: 120 + direction * (370 + 150 * roll) };
}

export function restingCoin(time) {
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

export function particles() {
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
