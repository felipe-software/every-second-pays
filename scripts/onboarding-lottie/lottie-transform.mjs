export const clamp = (value, from = 0, to = 1) => Math.min(to, Math.max(from, value));
export const round = (value) => Math.round(value * 1000) / 1000;

const LINEAR = { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };

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

function channel(samples, tolerance) {
    const points = simplify(samples, tolerance);
    const moving = points.some(([, value]) => Math.abs(value - points[0][1]) > tolerance);
    if (!moving) return { a: 0, k: round(points[0][1]) };
    return { a: 1, k: points.map(([time, value]) => ({ t: time, s: [round(value)], ...LINEAR })) };
}

function scaleChannel(xs, ys) {
    const keep = new Set([...simplify(xs, 0.1), ...simplify(ys, 0.1)].map(([time]) => time));
    const keyed = xs.flatMap(([time, x], index) =>
        keep.has(time) ? [{ t: time, s: [round(x), round(ys[index][1]), 100], ...LINEAR }] : [],
    );
    const still = keyed.every((key) => key.s[0] === keyed[0].s[0] && key.s[1] === keyed[0].s[1]);
    return still ? { a: 0, k: keyed[0].s } : { a: 1, k: keyed };
}

export function transform(pose, from, to, anchor = [0, 0]) {
    const samples = [];
    for (let frame = from; frame <= to; frame += 1) samples.push([frame, { r: 0, sx: 1, sy: 1, o: 1, ...pose(frame) }]);
    const take = (read) => samples.map(([frame, value]) => [frame, read(value)]);
    return {
        o: channel(
            take((value) => clamp(value.o) * 100),
            0.3,
        ),
        r: channel(
            take((value) => value.r),
            0.1,
        ),
        p: {
            s: true,
            x: channel(
                take((value) => value.x),
                0.05,
            ),
            y: channel(
                take((value) => value.y),
                0.05,
            ),
        },
        a: { a: 0, k: [...anchor, 0] },
        s: scaleChannel(
            take((value) => value.sx * 100),
            take((value) => value.sy * 100),
        ),
    };
}
