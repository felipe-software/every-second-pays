import type { Pattern } from "react-native-pulsar";

export type Primitive = "click" | "tick" | "lowTick" | "thud" | "spin" | "quickRise" | "slowRise" | "quickFall";

export type Note = readonly [time: number, primitive: Primitive, scale: number];

export type PrimitiveDurations = Record<Primitive, number>;

export type Chunk = { at: number; primitives: Primitive[]; scales: number[]; delays: number[] };

// Android splits a longer composition into several, with a gap between them.
const CHUNK_SIZE = 10;
const MAX_LATE = 25;
// After a pause this long the next note starts a chunk of its own, timed by the clock rather
// than by how long the vibrator says its primitives last.
const NEW_CHUNK_PAUSE = 100;

export function canCompose(score: readonly Note[], durations: PrimitiveDurations) {
    return score.every(([, primitive]) => durations[primitive] > 0);
}

// A composition starts each primitive a delay after the previous one ends, so a note the
// previous one is still playing over waits for it, or is dropped if that would make it late.
export function toChunks(score: readonly Note[], durations: PrimitiveDurations, from = 0): Chunk[] {
    const chunks: Chunk[] = [];
    let chunk: Chunk | undefined;
    let end = -Infinity;
    for (const [time, primitive, scale] of [...score].sort((a, b) => a[0] - b[0])) {
        if (time < from) continue;
        const start = Math.max(time, end);
        if (start - time > MAX_LATE) continue;
        if (!chunk || chunk.primitives.length === CHUNK_SIZE || start - end >= NEW_CHUNK_PAUSE) {
            chunk = { at: Math.round(start - from), primitives: [], scales: [], delays: [] };
            chunks.push(chunk);
            chunk.delays.push(0);
        } else {
            chunk.delays.push(Math.round(start - end));
        }
        chunk.primitives.push(primitive);
        chunk.scales.push(scale);
        end = start + durations[primitive];
    }
    return chunks;
}

type Transient = readonly [time: number, amplitude: number, frequency: number];

// Each primitive as a run of transients, for Core Haptics and for vibrators without primitives.
const TRANSIENTS: Record<Primitive, readonly Transient[]> = {
    click: [[0, 1, 0.8]],
    tick: [[0, 0.6, 1]],
    lowTick: [[0, 0.8, 0.2]],
    thud: [[0, 1, 0.15], [50, 0.55, 0.1], [110, 0.3, 0.1], [190, 0.15, 0.1]],
    spin: [[0, 0.3, 0.5], [25, 0.6, 0.55], [50, 0.4, 0.5], [75, 0.7, 0.55], [100, 0.45, 0.5], [125, 0.25, 0.5]],
    quickRise: [[0, 0.15, 0.3], [30, 0.3, 0.4], [60, 0.5, 0.5], [90, 0.7, 0.6], [120, 0.85, 0.7], [145, 1, 0.8]],
    slowRise: Array.from({ length: 17 }, (_, step) => [step * 30, 0.1 + (0.9 * step) / 16, 0.3 + (0.4 * step) / 16]),
    quickFall: [[0, 1, 0.6], [25, 0.6, 0.5], [50, 0.35, 0.4], [75, 0.15, 0.3]],
};

export function toPattern(score: readonly Note[]): Pattern {
    return {
        discretePattern: score
            .flatMap(([time, primitive, scale]) => TRANSIENTS[primitive].map(([after, amplitude, frequency]) => ({
                time: time + after,
                amplitude: amplitude * scale,
                frequency,
            })))
            .sort((a, b) => a.time - b.time),
        continuousPattern: { amplitude: [], frequency: [] },
    };
}
