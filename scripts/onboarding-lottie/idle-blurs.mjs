const GAUSSIAN_BLUR = 29;
const MIN_SPAN = 1;

const scalar = (value) => (Array.isArray(value) ? value[0] : value);

function onlyBlur(layer) {
    const effects = layer.ef ?? [];
    if (effects.length !== 1) return null;
    const [effect] = effects;
    return effect.ty === GAUSSIAN_BLUR && effect.en !== 0 ? effect : null;
}

function blurriness(effect) {
    return effect.ef?.find((param) => param.mn === "ADBE Gaussian Blur 2-0001" || param.nm === "Blurriness")?.v;
}

function zeroSpans(prop) {
    if (!prop) return [];
    if (prop.a !== 1) return scalar(prop.k) === 0 ? [[-Infinity, Infinity]] : [];
    const keys = prop.k;
    if (!keys.every((key) => key.s !== undefined)) return [];
    const isZero = (key) => scalar(key.s) === 0;
    const spans = [];
    let start = isZero(keys[0]) ? -Infinity : null;
    for (let index = 0; index < keys.length - 1; index++) {
        const key = keys[index];
        const flat = isZero(key) && (key.h === 1 || isZero(keys[index + 1]));
        if (flat) {
            start ??= key.t;
        } else if (start !== null) {
            spans.push([start, key.t]);
            start = null;
        }
    }
    const last = keys.at(-1);
    if (isZero(last)) spans.push([start ?? last.t, Infinity]);
    else if (start !== null) spans.push([start, last.t]);
    return spans;
}

function pieces(layer, spans) {
    const result = [];
    let cursor = layer.ip;
    for (const [from, to] of spans) {
        if (from > cursor) result.push({ ip: cursor, op: from, blurred: true });
        result.push({ ip: from, op: to, blurred: false });
        cursor = to;
    }
    if (cursor < layer.op) result.push({ ip: cursor, op: layer.op, blurred: true });
    return result;
}

function splitLayers(layers) {
    let nextInd = Math.max(0, ...layers.map((layer) => layer.ind ?? 0)) + 1;
    let split = 0;
    const result = [];
    for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        const blur = onlyBlur(layer);
        const inMattePair = layer.td || layer.tt || layers[index + 1]?.tt;
        const spans =
            blur && !inMattePair && !layer.tm
                ? zeroSpans(blurriness(blur))
                      .map(([from, to]) => [Math.max(from, layer.ip), Math.min(to, layer.op)])
                      .filter(([from, to]) => to - from >= MIN_SPAN)
                : [];
        if (!spans.length) {
            result.push(layer);
            continue;
        }
        const template = structuredClone(layer);
        pieces(layer, spans).forEach((piece, position) => {
            const copy = position === 0 ? layer : { ...structuredClone(template), ind: nextInd++ };
            copy.ip = piece.ip;
            copy.op = piece.op;
            if (!piece.blurred) delete copy.ef;
            result.push(copy);
        });
        split++;
    }
    return { layers: result, split };
}

// Skottie isolates a blurred layer offscreen every frame, even while its blurriness holds at zero.
export function splitIdleBlurs(animation) {
    let split = 0;
    for (const comp of [animation, ...(animation.assets ?? [])]) {
        if (!comp.layers) continue;
        const result = splitLayers(comp.layers);
        comp.layers = result.layers;
        split += result.split;
    }
    return split;
}
