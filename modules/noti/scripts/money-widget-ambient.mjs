import { i, NS, rotate, round, seededRandom, translate } from "./resource-xml.mjs";

const { random, between } = seededRandom(0x5eed);

// Constant velocity over one-second animations joins frames up; MoneyAmbient simulates the same paths.
const depthOf = (index) => index % 3;
const DEPTH_SIZE = [0.62, 0.8, 1];
const DEPTH_ALPHA = [0.5, 0.78, 1];
export const UNIT = 36;
const slot = (index, extra) => {
    const depth = depthOf(index);
    return {
        depth,
        size: DEPTH_SIZE[depth],
        alpha: DEPTH_ALPHA[depth],
        rotation: Math.round(between(-30, 30)),
        phase: round(random(), 3),
        ...extra,
    };
};
export const ambient = {};
ambient.rain = Array.from({ length: 10 }, (_, index) =>
    slot(index, { vx: round(between(-0.06, 0.06), 3), vy: [0.55, 0.75, 1][depthOf(index)] }),
);
ambient.stream = Array.from({ length: 10 }, (_, index) =>
    slot(index, { vx: [0.6, 0.8, 1.05][depthOf(index)], vy: round(between(-0.05, 0.05), 3) }),
);
ambient.fountain = Array.from({ length: 10 }, (_, index) =>
    slot(index, { vx: round(between(-0.08, 0.08), 3), vy: -[0.55, 0.75, 1][depthOf(index)] }),
);
ambient.orbit = Array.from({ length: 8 }, (_, index) =>
    slot(index, {
        spin: Math.round(between(22, 38)) * (index % 3 === 2 ? -1 : 1),
        radius: [0.5, 0.65, 0.8][depthOf(index)],
    }),
);
// Zero at both ends of the second so consecutive frames join up.
const wobbleWave = () => {
    const harmonics = [
        [1, 1, random()],
        [2, between(0.15, 0.4), random()],
    ];
    const raw = (t) => harmonics.reduce((sum, [k, a, p]) => sum + a * Math.sin(2 * Math.PI * (k * t + p)), 0);
    const start = raw(0);
    return (t) => raw(t) - start;
};
const wobblePoint = (x, y) => `${round(x, 4)},${round(y, 4)}`;
// Interpolators only run 0 to 1, so a wobble is two animations: t + wave(t), then a linear -t.
const wobbleInterpolator = (write, name, wave) => {
    const f = (t) => t + wave(t);
    const slope = (t) => (f(t + 1e-4) - f(t - 1e-4)) / 2e-4;
    const steps = 12;
    const h = 1 / steps;
    let pathData = "M0,0";
    for (let step = 0; step < steps; step++) {
        const x0 = step * h;
        const x1 = x0 + h;
        const y0 = step === 0 ? 0 : f(x0);
        const y1 = step === steps - 1 ? 1 : f(x1);
        pathData += ` C${wobblePoint(x0 + h / 3, y0 + (slope(x0) * h) / 3)} ${wobblePoint(x1 - h / 3, y1 - (slope(x1) * h) / 3)} ${wobblePoint(x1, y1)}`;
    }
    write(`interpolator/${name}.xml`, `<pathInterpolator ${NS} android:pathData="${pathData}" />`);
    return i(name);
};

export function addAmbientAnimations({ write, anim }) {
    for (const [name, slots] of Object.entries(ambient)) {
        slots.forEach((spec, index) => {
            if (name === "orbit") {
                anim(`nmw_seg_${name}_${index}`, [
                    rotate({ fromDegrees: 0, toDegrees: spec.spin, duration: 1000, interpolator: i("nmw_i_linear") }),
                ]);
                anim(`nmw_seg_${name}_${index}_bill`, [
                    rotate({ fromDegrees: 0, toDegrees: -spec.spin, duration: 1000, interpolator: i("nmw_i_linear") }),
                ]);
                for (const part of ["", "_bill"]) {
                    write(
                        `anim/nmw_la_${name}_${index}${part}.xml`,
                        `<layoutAnimation ${NS} android:animation="@anim/nmw_seg_${name}_${index}${part}" android:delay="0" />`,
                    );
                }
                return;
            }
            const tilt = Math.round(between(5, 10)) * (random() < 0.5 ? -1 : 1);
            const sway = round(between(4, 10), 1) * (random() < 0.5 ? -1 : 1);
            const tiltCurve = wobbleInterpolator(write, `nmw_i_tilt_${name}_${index}`, wobbleWave());
            const swayCurve = wobbleInterpolator(write, `nmw_i_sway_${name}_${index}`, wobbleWave());
            const across = (value) =>
                name === "stream"
                    ? { fromYDelta: "0", toYDelta: `${value}%` }
                    : { fromXDelta: "0", toXDelta: `${value}%` };
            anim(`nmw_seg_${name}_${index}`, [
                rotate({ fromDegrees: 0, toDegrees: tilt, duration: 1000, interpolator: tiltCurve }),
                rotate({ fromDegrees: 0, toDegrees: -tilt, duration: 1000, interpolator: i("nmw_i_linear") }),
                translate({
                    fromXDelta: "0",
                    toXDelta: `${round(spec.vx * 100, 1)}%`,
                    fromYDelta: "0",
                    toYDelta: `${round(spec.vy * 100, 1)}%`,
                    duration: 1000,
                    interpolator: i("nmw_i_linear"),
                }),
                translate({ ...across(sway), duration: 1000, interpolator: swayCurve }),
                translate({ ...across(-sway), duration: 1000, interpolator: i("nmw_i_linear") }),
            ]);
            write(
                `anim/nmw_la_${name}_${index}.xml`,
                `<layoutAnimation ${NS} android:animation="@anim/nmw_seg_${name}_${index}" android:delay="0" />`,
            );
        });
    }
}
