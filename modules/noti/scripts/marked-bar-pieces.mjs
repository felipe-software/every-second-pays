import { alpha, i, rotate, round, scale, seededRandom, translate } from "./resource-xml.mjs";

const { random, between } = seededRandom(0xb111);

const percent = (value) => `${round(value * 100, 1)}%p`;

export const scaleBy = (from, to, [startOffset, duration, interpolator]) =>
    scale({
        fromXScale: from,
        toXScale: to,
        fromYScale: from,
        toYScale: to,
        startOffset,
        duration,
        interpolator: i(interpolator),
    });

export function billPiece(anim, name, angle, at) {
    const distance = between(0.5, 1.14);
    const size = round(between(0.78, 1.24));
    const startAngle = round(between(-40, 40), 0);
    const spin = round(between(-280, 280), 0);
    const gravity = between(0.4, 0.9);
    const flip = random() < 0.5 ? -1 : 1;
    const duration = round(between(860, 1240), 0);
    const delay = at + round(random() * 50, 0);
    anim(name, [
        rotate({
            fromDegrees: startAngle,
            toDegrees: startAngle + spin,
            startOffset: delay,
            duration,
            interpolator: i("nmb_i_out"),
        }),
        scaleBy(0.25, 1.2, [delay, round(duration * 0.1, 0), "nmb_i_soft"]),
        scaleBy(1, 0.833, [delay + round(duration * 0.1, 0), round(duration * 0.08, 0), "nmb_i_soft"]),
        alpha({
            fromAlpha: 0,
            toAlpha: 1,
            startOffset: delay,
            duration: round(duration * 0.04, 0),
            interpolator: i("nmb_i_linear"),
        }),
        alpha({
            fromAlpha: 1,
            toAlpha: 0,
            startOffset: delay + round(duration * 0.7, 0),
            duration: round(duration * 0.3, 0),
            interpolator: i("nmb_i_linear"),
        }),
        translate({
            fromXDelta: "0",
            toXDelta: percent(Math.cos(angle) * distance),
            fromYDelta: "0",
            toYDelta: percent(Math.sin(angle) * distance),
            startOffset: delay,
            duration,
            interpolator: i("nmb_i_out"),
        }),
        translate({
            fromYDelta: "0",
            toYDelta: percent(gravity),
            startOffset: delay,
            duration,
            interpolator: i("nmb_i_fall"),
        }),
    ]);
    return { size, flip };
}

export function sparkPiece(anim, name, angle, at) {
    const distance = between(0.42, 0.95);
    const streak = random() < 0.62;
    const width = round(streak ? between(10, 18) : between(3, 6), 1);
    const height = streak ? 2.6 : width;
    const tone = Math.floor(random() * 4);
    const duration = round(between(420, 640), 0);
    anim(name, [
        scaleBy(1, 0.35, [at, duration, "nmb_i_linear"]),
        alpha({
            fromAlpha: 0,
            toAlpha: 1,
            startOffset: at,
            duration: round(duration * 0.06, 0),
            interpolator: i("nmb_i_linear"),
        }),
        alpha({
            fromAlpha: 1,
            toAlpha: 0,
            startOffset: at + round(duration * 0.5, 0),
            duration: round(duration * 0.5, 0),
            interpolator: i("nmb_i_linear"),
        }),
        translate({
            fromXDelta: "0",
            toXDelta: percent(Math.cos(angle) * distance),
            fromYDelta: "0",
            toYDelta: percent(Math.sin(angle) * distance),
            startOffset: at,
            duration,
            interpolator: i("nmb_i_out_hard"),
        }),
        translate({
            fromYDelta: "0",
            toYDelta: percent(0.15),
            startOffset: at,
            duration,
            interpolator: i("nmb_i_fall"),
        }),
    ]);
    return { width, height, tone, rotation: round((angle * 180) / Math.PI, 0) };
}

export function flashAnim(anim, name, at) {
    anim(name, [
        scale({
            fromXScale: 0.18,
            toXScale: 1,
            fromYScale: 0.18,
            toYScale: 1,
            startOffset: at,
            duration: 198,
            interpolator: i("nmb_i_out_hard"),
        }),
        alpha({ fromAlpha: 0, toAlpha: 0.95, startOffset: at, duration: 35, interpolator: i("nmb_i_linear") }),
        alpha({ fromAlpha: 1, toAlpha: 0, startOffset: at + 35, duration: 405, interpolator: i("nmb_i_linear") }),
    ]);
}

export function ringAnim(anim, name, at, duration) {
    anim(name, [
        scale({
            fromXScale: 0.08,
            toXScale: 1,
            fromYScale: 0.08,
            toYScale: 1,
            startOffset: at,
            duration,
            interpolator: i("nmb_i_out_hard"),
        }),
        alpha({ fromAlpha: 0, toAlpha: 0.85, startOffset: at, duration: 1, interpolator: i("nmb_i_linear") }),
        alpha({ fromAlpha: 1, toAlpha: 0, startOffset: at, duration, interpolator: i("nmb_i_linear") }),
    ]);
}
