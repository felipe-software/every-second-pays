import { alpha, i, rotate, round, scale, translate } from "./resource-xml.mjs";

// The whole landing beat must fit in one second-long timeline frame.
export const IMPACT = 440;

export const motions = {
    roll: {
        in: [
            scale({
                fromXScale: 0.86,
                toXScale: 1,
                fromYScale: 0.7,
                toYScale: 1,
                duration: 520,
                interpolator: i("nmw_i_overshoot"),
            }),
            alpha({ fromAlpha: 0.4, toAlpha: 1, duration: 140, interpolator: i("nmw_i_decelerate") }),
            translate({ fromYDelta: "100%", toYDelta: "0", duration: 560, interpolator: i("nmw_i_overshoot") }),
        ],
        out: [
            scale({
                fromXScale: 1,
                toXScale: 0.86,
                fromYScale: 1,
                toYScale: 0.7,
                duration: 420,
                interpolator: i("nmw_i_accelerate"),
            }),
            alpha({ fromAlpha: 1, toAlpha: 0.3, duration: 420, interpolator: i("nmw_i_accelerate") }),
            translate({ fromYDelta: "0", toYDelta: "-100%", duration: 420, interpolator: i("nmw_i_decelerate") }),
        ],
    },
    drop: {
        in: [
            alpha({ fromAlpha: 0, toAlpha: 1, duration: 160, interpolator: i("nmw_i_decelerate") }),
            translate({ fromYDelta: "-120%", toYDelta: "0", duration: 760, interpolator: i("nmw_i_bounce") }),
        ],
        out: [
            scale({
                fromXScale: 1,
                toXScale: 0.6,
                fromYScale: 1,
                toYScale: 0.6,
                duration: 340,
                interpolator: i("nmw_i_accelerate"),
            }),
            alpha({ fromAlpha: 1, toAlpha: 0, duration: 300, interpolator: i("nmw_i_accelerate") }),
            translate({ fromYDelta: "0", toYDelta: "80%", duration: 340, interpolator: i("nmw_i_accelerate") }),
        ],
    },
    flip: {
        in: [
            scale({
                fromXScale: 1,
                toXScale: 1,
                fromYScale: 0,
                toYScale: 1,
                startOffset: 170,
                duration: 300,
                interpolator: i("nmw_i_overshoot_soft"),
            }),
            alpha({
                fromAlpha: 0.35,
                toAlpha: 1,
                startOffset: 170,
                duration: 300,
                interpolator: i("nmw_i_decelerate"),
            }),
        ],
        out: [
            scale({
                fromXScale: 1,
                toXScale: 1,
                fromYScale: 1,
                toYScale: 0,
                duration: 170,
                interpolator: i("nmw_i_accelerate"),
            }),
            alpha({ fromAlpha: 1, toAlpha: 0.35, duration: 170, interpolator: i("nmw_i_accelerate") }),
        ],
    },
    blur: {
        in: [
            scale({
                fromXScale: 1.9,
                toXScale: 1,
                fromYScale: 1.9,
                toYScale: 1,
                duration: 480,
                interpolator: i("nmw_i_decelerate_hard"),
            }),
            alpha({ fromAlpha: 0, toAlpha: 1, duration: 360, interpolator: i("nmw_i_decelerate") }),
        ],
        out: [
            scale({
                fromXScale: 1,
                toXScale: 0.35,
                fromYScale: 1,
                toYScale: 0.35,
                duration: 320,
                interpolator: i("nmw_i_accelerate"),
            }),
            alpha({ fromAlpha: 1, toAlpha: 0, duration: 280, interpolator: i("nmw_i_accelerate") }),
        ],
    },
    slot: {
        in: [
            scale({
                fromXScale: 0.92,
                toXScale: 1,
                fromYScale: 1.8,
                toYScale: 1,
                duration: 620,
                interpolator: i("nmw_i_decelerate_hard"),
            }),
            translate({ fromYDelta: "180%", toYDelta: "0", duration: 620, interpolator: i("nmw_i_decelerate_hard") }),
        ],
        out: [
            scale({
                fromXScale: 1,
                toXScale: 0.92,
                fromYScale: 1,
                toYScale: 1.8,
                duration: 300,
                interpolator: i("nmw_i_accelerate"),
            }),
            translate({ fromYDelta: "0", toYDelta: "-180%", duration: 300, interpolator: i("nmw_i_accelerate") }),
        ],
    },
};

const late = (children, offset) =>
    children.map((child) =>
        child
            .replace(/android:startOffset="(\d+)"/, (_, value) => `android:startOffset="${Number(value) + offset}"`)
            .replace(/^<(\w+) (?!.*startOffset)/, `<$1 android:startOffset="${offset}" `),
    );

export function addMotionAnimations({ anim }) {
    for (const [name, motion] of Object.entries(motions)) {
        anim(`nmw_m_${name}_in`, motion.in);
        anim(`nmw_m_${name}_out`, motion.out);
        anim(`nmw_m_${name}_in_late`, late(motion.in, IMPACT));
        anim(`nmw_m_${name}_out_late`, late(motion.out, IMPACT));
    }

    for (const [name, peak] of [
        ["cents", 1.045],
        ["whole", 1.1],
    ]) {
        anim(`nmw_bump_${name}`, [
            scale({
                fromXScale: 1,
                toXScale: peak,
                fromYScale: 1,
                toYScale: peak,
                startOffset: IMPACT,
                duration: 105,
                interpolator: i("nmw_i_decelerate"),
            }),
            scale({
                fromXScale: 1,
                toXScale: round(1 / peak, 4),
                fromYScale: 1,
                toYScale: round(1 / peak, 4),
                startOffset: IMPACT + 105,
                duration: 420,
                interpolator: i("nmw_i_overshoot"),
            }),
        ]);
    }
}

// The renderer stretches the box to the digit, so 100%p minus 100% of the bill lands on it.
export const QUADRANTS = { lt: [1, 1], rt: [-1, 1], lb: [1, -1], rb: [-1, -1] };

export function addFlightAnimations({ anim }) {
    for (const [quadrant, [sx, sy]] of Object.entries(QUADRANTS)) {
        anim(`nmw_fly_${quadrant}`, [
            rotate({ fromDegrees: 0, toDegrees: -18 * sx, duration: IMPACT, interpolator: i("nmw_i_cubic") }),
            scale({
                fromXScale: 1,
                toXScale: 1.12,
                fromYScale: 1,
                toYScale: 1.12,
                duration: 90,
                interpolator: i("nmw_i_decelerate"),
            }),
            scale({
                fromXScale: 1,
                toXScale: 0.22,
                fromYScale: 1,
                toYScale: 0.22,
                startOffset: 90,
                duration: IMPACT - 90,
                interpolator: i("nmw_i_late"),
            }),
            alpha({
                fromAlpha: 1,
                toAlpha: 0,
                startOffset: IMPACT - 70,
                duration: 70,
                interpolator: i("nmw_i_accelerate"),
            }),
            translate({
                fromXDelta: "0",
                toXDelta: `${100 * sx}%p`,
                fromYDelta: "0",
                toYDelta: `${100 * sy}%p`,
                duration: IMPACT,
                interpolator: i("nmw_i_cubic"),
            }),
            translate({
                fromXDelta: "0",
                toXDelta: `${-100 * sx}%`,
                fromYDelta: "0",
                toYDelta: `${-100 * sy}%`,
                duration: IMPACT,
                interpolator: i("nmw_i_cubic"),
            }),
            translate({ fromXDelta: "0", toXDelta: `${-35 * sy}%`, duration: IMPACT, interpolator: i("nmw_i_bow") }),
        ]);
    }
}
