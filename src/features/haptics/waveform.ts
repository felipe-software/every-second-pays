import type { Pattern } from "react-native-pulsar";

export type Waveform = { timings: number[]; amplitudes: number[] };

const STEP = 10;
const MAX_AMPLITUDE = 255;

function hitLength(frequency: number) {
    if (frequency > 0.66) return STEP;
    if (frequency > 0.33) return 2 * STEP;
    return 3 * STEP;
}

function rumbleAt(points: Pattern["continuousPattern"]["amplitude"], time: number) {
    const after = points.findIndex((point) => point.time > time);
    if (after <= 0) return 0;
    const from = points[after - 1];
    const to = points[after];
    return from.value + ((to.value - from.value) * (time - from.time)) / (to.time - from.time);
}

// Android can't layer a pattern's sharp hits over its rumble, so both become one amplitude
// curve: each hit a short full-strength step that stands out of the rumble under it.
export function toWaveform(pattern: Pattern): Waveform {
    const rumble = pattern.continuousPattern.amplitude;
    const hits = pattern.discretePattern;
    const end = Math.max(
        rumble.at(-1)?.time ?? 0,
        ...hits.map((hit) => hit.time + hitLength(hit.frequency)),
    );

    const timings: number[] = [];
    const amplitudes: number[] = [];
    for (let time = 0; time < end; time += STEP) {
        const hit = Math.max(0, ...hits
            .filter((h) => time >= h.time && time < h.time + hitLength(h.frequency))
            .map((h) => h.amplitude));
        const level = Math.min(1, Math.max(hit, rumbleAt(rumble, time)));
        const amplitude = Math.round(level * MAX_AMPLITUDE);
        const length = Math.min(STEP, end - time);
        if (amplitudes.at(-1) === amplitude) timings[timings.length - 1] += length;
        else {
            timings.push(length);
            amplitudes.push(amplitude);
        }
    }
    return { timings, amplitudes };
}
