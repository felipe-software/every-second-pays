import { writeFileSync } from "node:fs";

import { getThemeColors } from "../../src/features/appearance/palettes.ts";
import { ALLOWED, BELL_CUES, COIN, COIN_EVERY } from "../../src/features/onboarding/bell-timeline.ts";
import { transform } from "./lottie-transform.mjs";
import {
    BASE_ART,
    BILL_ART,
    CHECK_ART,
    COIN_ART,
    color,
    DOME_ART,
    GLOW_ART,
    PLUNGER_ART,
    RING_ART,
    still,
} from "./service-bell-art.mjs";
import {
    ALLOW,
    bell,
    BELL_X,
    BELL_Y,
    coinFlight,
    COIN_SCALE,
    DECLINE,
    FPS,
    frames,
    glow,
    HIT,
    LAST,
    LOOP,
    particles,
    restingCoin,
    rings,
    seg,
    spring,
} from "./service-bell-poses.mjs";

const OUTPUT = new URL("../../src/assets/onboarding/notifications.json", import.meta.url);

let nextIndex = 1;
const shapeLayer = (art, ks, from, to) => ({
    ty: 4,
    ind: nextIndex++,
    ip: from,
    op: to + 1,
    st: 0,
    ks,
    shapes: art.toReversed(),
});
const STATIC_KS = (x, y) => ({
    o: still(100),
    r: still(0),
    p: still([x, y, 0]),
    a: still([0, 0, 0]),
    s: still([100, 100, 100]),
});
const asset = (id, w, h, art) => ({
    id,
    w,
    h,
    layers: [{ ty: 4, ind: 1, ip: 0, op: LAST, st: 0, ks: STATIC_KS(w / 2, h / 2), shapes: art.toReversed() }],
});
const ASSET_SIZE = { coin: [80, 80], bill: [90, 60] };
const sprite = (id, pose, from, to) => {
    const [w, h] = ASSET_SIZE[id];
    return {
        ty: 0,
        refId: id,
        w,
        h,
        ind: nextIndex++,
        ip: from,
        op: to + 1,
        st: 0,
        ks: transform(pose, from, to, [w / 2, h / 2]),
    };
};

const coinPose = (start, direction) => (frame) => ({
    ...coinFlight((frame - start) / FPS, direction),
    sx: COIN_SCALE,
    sy: COIN_SCALE,
});
const flyingCoin = (start, direction) => sprite("coin", coinPose(start, direction), start, start + frames(COIN.gone));

const askCoins = [flyingCoin(LOOP[0], -1), flyingCoin(LOOP[0] + frames(COIN_EVERY), 1)];
const allowedCoins = ALLOWED.coins.map((offset, index) => flyingCoin(ALLOW[0] + frames(offset), index % 2 ? 1 : -1));
const declinedCoin = sprite(
    "coin",
    (frame) => ({ ...restingCoin((frame - DECLINE[0]) / FPS), sx: COIN_SCALE, sy: COIN_SCALE }),
    DECLINE[0],
    DECLINE[1],
);

const burstStart = ALLOW[0] + frames(COIN.hit);
const burst = particles().map(({ asset: id, vx, vy, spin, scale }) =>
    sprite(
        id,
        (frame) => {
            const time = (frame - burstStart) / FPS;
            return {
                x: BELL_X + vx * time,
                y: BELL_Y - 140 + vy * time + 640 * time * time,
                r: spin * time,
                sx: scale,
                sy: scale,
                o: 1 - seg(time, 0.8, 1.4),
            };
        },
        burstStart,
        burstStart + frames(1400),
    ),
);

const check = shapeLayer(
    CHECK_ART,
    transform(
        (frame) => {
            const shown = spring(seg((frame - ALLOW[0]) / FPS - HIT, 0.6, 1.2));
            return { x: BELL_X + 108, y: BELL_Y - 112, sx: shown, sy: shown, o: shown > 0 ? 1 : 0 };
        },
        ALLOW[0],
        ALLOW[1],
    ),
    ALLOW[0],
    ALLOW[1],
);

const whole = (read) => transform(read, 0, LAST - 1);
const layers = [
    check,
    ...burst,
    ...askCoins,
    ...allowedCoins,
    declinedCoin,
    shapeLayer(
        DOME_ART,
        whole((frame) => bell(frame).dome),
        0,
        LAST - 1,
    ),
    shapeLayer(
        PLUNGER_ART,
        whole((frame) => bell(frame).plunger),
        0,
        LAST - 1,
    ),
    shapeLayer(
        BASE_ART,
        whole((frame) => bell(frame).base),
        0,
        LAST - 1,
    ),
    shapeLayer(RING_ART, whole(rings), 0, LAST - 1),
    shapeLayer(GLOW_ART, whole(glow), 0, LAST - 1),
];

const LOOKS = ["dark", "light"].flatMap((mode) =>
    ["green", "orange", "blue", "rose", "lavender"].map((palette) => ({ palette, mode })),
);
const themed = (read) => LOOKS.map(({ palette, mode }) => read(getThemeColors(palette, mode === "dark")));
const stops = (accent) => {
    const [r, g, b] = color(accent);
    return [0, r, g, b, 1, r, g, b, 0, 0.55, 1, 0];
};

const moments = (name, starts) => starts.map((start) => ({ frame: start + frames(BELL_CUES[name]), name }));

writeFileSync(
    OUTPUT,
    `${JSON.stringify({
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
        tokens: [
            themed(({ accent }) => color(accent)),
            themed(({ canvas }) => color(canvas)),
            themed(({ accent }) => stops(accent)),
        ],
        looks: LOOKS.map(({ palette, mode }) => `${palette}-${mode}`),
        variants: {},
        segments: { intro: [0, LOOP[0]], loop: LOOP, allowed: ALLOW, declined: DECLINE },
        cues: [
            ...moments("enter", [0]),
            ...moments("ask", [LOOP[0], LOOP[0] + frames(COIN_EVERY)]),
            ...moments("allowed", [ALLOW[0]]),
            ...moments("declined", [DECLINE[0]]),
        ],
    })}\n`,
);
