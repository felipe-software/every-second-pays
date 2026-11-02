import { round } from "./lottie-transform.mjs";

function arcToCubics({ x0, y0, rx, ry, largeArc, sweep, x1, y1 }) {
    const dx = (x0 - x1) / 2;
    const dy = (y0 - y1) / 2;
    const scale = Math.max(1, Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)));
    const [a, b] = [rx * scale, ry * scale];
    const sign = largeArc === sweep ? -1 : 1;
    const ratio =
        sign *
        Math.sqrt(
            Math.max(0, (a * a * b * b - a * a * dy * dy - b * b * dx * dx) / (a * a * dy * dy + b * b * dx * dx)),
        );
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
        return [
            px - handle * a * Math.sin(from),
            py + handle * b * Math.cos(from),
            qx + handle * a * Math.sin(to),
            qy - handle * b * Math.cos(to),
            qx,
            qy,
        ];
    });
}

const number = (pen) => Number(pen.tokens[pen.index++]);

function addPoint(pen, [px, py]) {
    pen.contour.v.push([px, py]);
    pen.contour.i.push([0, 0]);
    pen.contour.o.push([0, 0]);
    [pen.cx, pen.cy] = [px, py];
}

function addCurve(pen, [c1x, c1y, c2x, c2y, px, py]) {
    const { contour } = pen;
    contour.o[contour.o.length - 1] = [c1x - pen.cx, c1y - pen.cy];
    addPoint(pen, [px, py]);
    contour.i[contour.i.length - 1] = [c2x - px, c2y - py];
}

function closeContour(pen) {
    const { contour } = pen;
    const last = contour.v.length - 1;
    if (Math.hypot(contour.v[last][0] - contour.v[0][0], contour.v[last][1] - contour.v[0][1]) < 0.01) {
        contour.i[0] = contour.i[last];
        contour.v.pop();
        contour.i.pop();
        contour.o.pop();
    }
    contour.c = true;
    pen.result.push(contour);
    [pen.cx, pen.cy] = contour.v[0];
    pen.contour = undefined;
}

function moveTo(pen, ox, oy) {
    if (pen.contour) pen.result.push(pen.contour);
    pen.contour = { c: false, v: [], i: [], o: [] };
    addPoint(pen, [ox + number(pen), oy + number(pen)]);
}

function quadraticTo(pen, ox, oy) {
    const { cx, cy } = pen;
    const [qx, qy, px, py] = [ox + number(pen), oy + number(pen), ox + number(pen), oy + number(pen)];
    addCurve(pen, [
        cx + ((qx - cx) * 2) / 3,
        cy + ((qy - cy) * 2) / 3,
        px + ((qx - px) * 2) / 3,
        py + ((qy - py) * 2) / 3,
        px,
        py,
    ]);
}

function arcTo(pen, ox, oy) {
    const [rx, ry] = [number(pen), number(pen)];
    number(pen);
    const [large, sweep, px, py] = [number(pen), number(pen), ox + number(pen), oy + number(pen)];
    const arc = { x0: pen.cx, y0: pen.cy, rx, ry, largeArc: large === 1, sweep: sweep === 1, x1: px, y1: py };
    for (const cubic of arcToCubics(arc)) addCurve(pen, cubic);
}

const DRAW = {
    L: (pen, ox, oy) => addPoint(pen, [ox + number(pen), oy + number(pen)]),
    H: (pen, ox) => addPoint(pen, [ox + number(pen), pen.cy]),
    V: (pen, _ox, oy) => addPoint(pen, [pen.cx, oy + number(pen)]),
    C: (pen, ox, oy) =>
        addCurve(pen, [
            ox + number(pen),
            oy + number(pen),
            ox + number(pen),
            oy + number(pen),
            ox + number(pen),
            oy + number(pen),
        ]),
    Q: quadraticTo,
    A: arcTo,
};

function draw(pen, command) {
    const upper = command.toUpperCase();
    const [ox, oy] = command === upper ? [0, 0] : [pen.cx, pen.cy];
    if (upper === "Z") {
        closeContour(pen);
        return command;
    }
    if (upper === "M") {
        moveTo(pen, ox, oy);
        return command === "M" ? "L" : "l";
    }
    if (!DRAW[upper]) throw new Error(`Unsupported path command ${command}`);
    DRAW[upper](pen, ox, oy);
    return command;
}

function parse(d) {
    const pen = { tokens: d.match(/[a-zA-Z]|-?\d*\.?\d+/g), index: 0, contour: undefined, cx: 0, cy: 0, result: [] };
    let command;
    while (pen.index < pen.tokens.length) {
        if (/[a-zA-Z]/.test(pen.tokens[pen.index])) command = pen.tokens[pen.index++];
        command = draw(pen, command);
    }
    if (pen.contour) pen.result.push(pen.contour);
    return pen.result;
}

export function contours(d, { scale = 1, x = 0, y = 0 } = {}) {
    return parse(d).map((shape) => ({
        c: shape.c,
        v: shape.v.map(([px, py]) => [round(px * scale + x), round(py * scale + y)]),
        i: shape.i.map(([px, py]) => [round(px * scale), round(py * scale)]),
        o: shape.o.map(([px, py]) => [round(px * scale), round(py * scale)]),
    }));
}
