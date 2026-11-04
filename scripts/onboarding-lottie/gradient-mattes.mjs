const OPAQUE = 100;
const EDGE_TOLERANCE = 0.01;
const HOLD_GAP = 0.001;
// One stop count for every fade, so Skia compiles a single gradient program for all of them.
const FADE_STOPS = 48;
const PAINTS = new Set(["fl", "st", "gf", "gs"]);

const isStatic = (prop, value) =>
    prop === undefined || (prop.a !== 1 && JSON.stringify(prop.k) === JSON.stringify(value));
const scalar = (value) => (Array.isArray(value) ? value[0] : value);
const withoutOpacity = (transform) => JSON.stringify({ ...transform, o: undefined });
const sameOpacity = (a, b) => JSON.stringify(a.ks.o ?? null) === JSON.stringify(b.ks.o ?? null);
const settled = (prop, fallback) => {
    if (prop === undefined) return fallback;
    return prop.a === 1 ? prop.k.at(-1).s : prop.k;
};

const isIdentity = (transform) =>
    transform?.ty === "tr" &&
    isStatic(transform.p, [0, 0]) &&
    isStatic(transform.a, [0, 0]) &&
    isStatic(transform.s, [100, 100]) &&
    isStatic(transform.r, 0) &&
    isStatic(transform.o, OPAQUE);

function settleTime(prop) {
    if (prop?.a !== 1) return -Infinity;
    const keys = prop.k;
    const last = JSON.stringify(keys.at(-1).s);
    let index = keys.length - 1;
    while (index > 0 && JSON.stringify(keys[index - 1].s) === last) index--;
    return keys[index].t;
}

// Skottie draws a matte even while its layer is inactive; only an empty mask skips it.
function zeroFrom(opacity, at) {
    const value = [scalar(settled(opacity, OPAQUE))];
    if (opacity?.a !== 1)
        return {
            a: 1,
            k: [
                { t: at - 1, s: value, h: 1 },
                { t: at, s: [0] },
            ],
        };
    const settleAt = settleTime(opacity);
    const keys = opacity.k.filter((key) => key.t <= settleAt).map((key) => ({ ...key }));
    const hold = keys.at(-1);
    hold.h = 1;
    return { a: 1, k: [...keys, { t: Math.max(at, hold.t + HOLD_GAP), s: [0] }] };
}

const isBareShapeLayer = (layer) => layer?.ty === 4 && !layer.ef && !layer.hasMask && layer.shapes?.length === 1;

function matteShape(layer) {
    if (!layer?.td || !isBareShapeLayer(layer)) return null;
    const [group] = layer.shapes;
    if (group.ty !== "gr" || group.it.map((item) => item.ty).join(",") !== "rc,gf,tr") return null;
    const [rect, gradient, transform] = group.it;
    const square = rect.r === undefined || isStatic(rect.r, 0);
    const linear = gradient.t === 1 && gradient.g.k.a !== 1 && isStatic(gradient.o, OPAQUE);
    return isIdentity(transform) && square && linear ? { rect, gradient } : null;
}

function gradientMatte(layer) {
    const shape = matteShape(layer);
    if (!shape) return null;
    const { rect, gradient } = shape;
    const [cx, cy] = settled(rect.p);
    const [width, height] = settled(rect.s);
    return {
        gradient,
        settleAt: Math.max(...[rect.p, rect.s, gradient.s, gradient.e, layer.ks.o].map(settleTime)),
        opacity: scalar(settled(layer.ks.o, OPAQUE)),
        start: settled(gradient.s),
        end: settled(gradient.e),
        bounds: { left: cx - width / 2, top: cy - height / 2, right: cx + width / 2, bottom: cy + height / 2 },
    };
}

function stackedCopies(repeater) {
    if (!repeater) return { count: 1, pitch: 0 };
    const { tr } = repeater;
    const shiftsDown = tr.p.a !== 1 && tr.p.k[0] === 0 && isStatic(tr.a, [0, 0]);
    const keepsShape = isStatic(tr.s, [100, 100]) && isStatic(tr.r, 0);
    const keepsOpacity = isStatic(tr.so, OPAQUE) && isStatic(tr.eo, OPAQUE);
    const count = repeater.c.k;
    const fixedCount = repeater.c.a !== 1 && isStatic(repeater.o, 0) && Number.isInteger(count) && count >= 1;
    return shiftsDown && keepsShape && keepsOpacity && fixedCount ? { count, pitch: tr.p.k[1] } : null;
}

function rollsVertically(layer) {
    const { ks } = layer;
    const plainLayer = isBareShapeLayer(layer) && !layer.parent && !layer.tm && !layer.st;
    const upright = isStatic(ks.s, [100, 100, 100]) && isStatic(ks.r, 0) && !ks.sk && !ks.rx && !ks.ry && !ks.rz;
    const verticalOnly = ks.p?.s && ks.p.x.a !== 1 && ks.a.a !== 1;
    return plainLayer && upright && verticalOnly && isStatic(ks.o, OPAQUE);
}

function solidPaths(items) {
    const paints = items.filter((item) => PAINTS.has(item.ty));
    const repeaters = items.filter((item) => item.ty === "rp");
    const [fill] = paints;
    if (paints.length !== 1 || fill.ty !== "fl" || !isStatic(fill.o, OPAQUE) || fill.c.a === 1) return null;
    if (repeaters.length > 1 || (repeaters.length && items.indexOf(fill) > items.indexOf(repeaters[0]))) return null;
    const onlyPaths = items.slice(0, items.indexOf(fill)).every((item) => item.ty === "sh");
    return onlyPaths && isIdentity(items.at(-1)) ? { fill, repeater: repeaters[0] } : null;
}

function rollingStrip(comp) {
    if (comp?.layers?.length !== 1) return null;
    const [layer] = comp.layers;
    if (!rollsVertically(layer) || layer.shapes[0].ty !== "gr") return null;
    const items = layer.shapes[0].it;
    const paint = solidPaths(items);
    const copies = paint && stackedCopies(paint.repeater);
    return copies ? { layer, items, fill: paint.fill, copies } : null;
}

function tokenFor(tokens, value) {
    const json = JSON.stringify(value);
    const index = tokens.findIndex((token) => JSON.stringify(token) === json);
    return `#${index < 0 ? tokens.push(value) - 1 : index}`;
}

function fadeStops(matte, copies) {
    const [, startY] = matte.start;
    const fade = matte.end[1] - startY;
    const { count, pitch } = copies;
    const opacityStops = matte.gradient.g.k.k.slice(matte.gradient.g.p * 4);
    const span = fade + (count - 1) * pitch;
    const stops = [];
    // A repeater copy carries the fill along, so the fade repeats once per copy, a copy apart.
    for (let copy = count - 1; copy >= 0; copy--) {
        const base = (count - 1 - copy) * pitch;
        for (let stop = 0; stop < opacityStops.length; stop += 2) {
            stops.push((base + opacityStops[stop] * fade) / span, opacityStops[stop + 1]);
        }
    }
    return stops;
}

function padStops(stops) {
    const pairs = [];
    for (let index = 0; index < stops.length; index += 2) pairs.push([stops[index], stops[index + 1]]);
    if (pairs.length >= FADE_STOPS) return stops;
    const ends = [...pairs, [1, pairs.at(-1)[1]]];
    let widest = 0;
    for (let index = 1; index < ends.length - 1; index++) {
        if (ends[index + 1][0] - ends[index][0] > ends[widest + 1][0] - ends[widest][0]) widest = index;
    }
    const [[from, fromAlpha], [to, toAlpha]] = [ends[widest], ends[widest + 1]];
    const extra = FADE_STOPS - pairs.length;
    const filler = Array.from({ length: extra }, (_, step) => {
        const along = (step + 1) / (extra + 1);
        return [from + (to - from) * along, fromAlpha + (toAlpha - fromAlpha) * along];
    });
    pairs.splice(widest + 1, 0, ...filler);
    return pairs.flat();
}

function fadeFill({ strip, matte, tokens, from, foldAt }) {
    const { layer, items, fill, copies } = strip;
    const { ks } = layer;
    const colorToken = /^#(\d+)$/.exec(fill.c.k)?.[1];
    const looks = colorToken === undefined ? null : tokens[Number(colorToken)];
    if (!looks || looks.some((color) => color.length !== 4 || color[3] !== 1)) return false;
    const [startX, startY] = matte.start;
    const [endX, endY] = matte.end;
    const fade = endY - startY;
    if (startX !== endX || fade <= 0 || (copies.count > 1 && copies.pitch <= fade)) return false;

    const faded = padStops(fadeStops(matte, copies));
    const opaque = faded.map((value, index) => (index % 2 ? 1 : value));
    const stopsFor = (alphas) =>
        tokenFor(
            tokens,
            looks.map(([r, g, b]) => [0, r, g, b, 1, r, g, b, ...alphas]),
        );
    const split = foldAt > from;
    const stops = split
        ? {
              a: 1,
              k: [
                  { t: from, s: stopsFor(opaque), h: 1 },
                  { t: foldAt, s: stopsFor(faded) },
              ],
          }
        : { a: 0, k: stopsFor(faded) };

    const offsetX = ks.a.k[0] - ks.p.x.k;
    const toStrip = (y, [x, py]) => [x + offsetX, ks.a.k[1] - y + py];
    // Keyed like the strip's roll, so the fade holds still in the matte's frame.
    const point = (base) =>
        ks.p.y.a === 1
            ? { a: 1, k: ks.p.y.k.map(({ s, ...key }) => ({ ...key, s: toStrip(scalar(s), base) })) }
            : { a: 0, k: toStrip(scalar(ks.p.y.k), base) };

    const gradient = {
        ty: "gf",
        o: { a: 0, k: split ? OPAQUE : matte.opacity },
        r: fill.r,
        g: { p: 2, k: stops },
        s: point([startX, startY - (copies.count - 1) * copies.pitch]),
        e: point([endX, endY]),
        t: 1,
    };
    if (fill.bm !== undefined) gradient.bm = fill.bm;
    items[items.indexOf(fill)] = gradient;
    return true;
}

function sharesFrame(matteLayer, content, matte) {
    const sameTransform =
        withoutOpacity(matteLayer.ks) === withoutOpacity(content.ks) && matteLayer.parent === content.parent;
    const covers = matteLayer.ip <= content.ip && matteLayer.op >= content.op && !matteLayer.st;
    const fromCorner = matte.bounds.left <= EDGE_TOLERANCE && matte.bounds.top <= EDGE_TOLERANCE;
    return sameTransform && covers && fromCorner && sameOpacity(matteLayer, content);
}

function foldable(layers, index, assets, references) {
    const content = layers[index];
    const matteLayer = layers[index - 1];
    const plainPrecomp = content.tt === 1 && content.ty === 0 && !content.tm && !content.st && (content.sr ?? 1) === 1;
    if (!plainPrecomp || references.get(content.refId) !== 1) return null;
    const matte = gradientMatte(matteLayer);
    const strip = rollingStrip(assets.get(content.refId));
    if (!matte || !strip || !sharesFrame(matteLayer, content, matte)) return null;
    if (layers.some((layer) => layer.parent === matteLayer.ind || layer.parent === content.ind)) return null;
    const foldAt = Math.max(content.ip, matte.settleAt);
    const fadesAfterSplit = foldAt > content.ip && matte.opacity !== OPAQUE;
    return foldAt < content.op && !fadesAfterSplit ? { content, matteLayer, matte, strip, foldAt } : null;
}

function foldComp(comp, assets, references, tokens) {
    const layers = comp.layers;
    let nextInd = Math.max(0, ...layers.map((layer) => layer.ind ?? 0)) + 1;
    let folded = 0;
    for (let index = 1; index < layers.length; index++) {
        const fold = foldable(layers, index, assets, references);
        if (!fold) continue;
        const { content, matteLayer, matte, strip, foldAt } = fold;
        if (!fadeFill({ strip, matte, tokens, from: content.ip, foldAt })) continue;
        const plain = structuredClone(content);
        delete plain.tt;
        plain.ip = foldAt;
        plain.w = Math.min(content.w, matte.bounds.right);
        plain.h = Math.min(content.h, matte.bounds.bottom);
        if (foldAt > content.ip) {
            content.op = foldAt;
            matteLayer.ks.o = zeroFrom(matteLayer.ks.o, foldAt);
            plain.ind = nextInd++;
            layers.splice(index + 1, 0, plain);
            index++;
        } else {
            layers.splice(index - 1, 2, plain);
            index--;
        }
        folded++;
    }
    return folded;
}

// A matte costs two offscreen layers a frame; a fade fixed in its frame can be the fill's gradient.
export function foldGradientMattes(animation, tokens) {
    const assets = new Map((animation.assets ?? []).map((asset) => [asset.id, asset]));
    const comps = [animation, ...assets.values()].filter((comp) => comp.layers);
    const references = new Map();
    for (const layer of comps.flatMap((comp) => comp.layers)) {
        if (layer.refId) references.set(layer.refId, (references.get(layer.refId) ?? 0) + 1);
    }
    return comps.reduce((total, comp) => total + foldComp(comp, assets, references, tokens), 0);
}
