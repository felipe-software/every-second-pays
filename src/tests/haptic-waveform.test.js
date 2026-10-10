import { describe, expect, test } from "bun:test";

const { toWaveform } = await import("../features/haptics/waveform");

const pattern = (hits, rumble = []) => ({
    discretePattern: hits.map(([time, amplitude, frequency]) => ({ time, amplitude, frequency })),
    continuousPattern: { amplitude: rumble.map(([time, value]) => ({ time, value })), frequency: [] },
});

function levelAt(waveform, time) {
    let start = 0;
    for (const [index, length] of waveform.timings.entries()) {
        if (time < start + length) return waveform.amplitudes[index];
        start += length;
    }
    return 0;
}

const total = (waveform) => waveform.timings.reduce((sum, length) => sum + length, 0);

describe("toWaveform", () => {
    test("a hit stands out of the rumble under it", () => {
        const waveform = toWaveform(pattern([[100, 1, 0.8]], [[0, 0.4], [200, 0.4]]));
        expect(levelAt(waveform, 50)).toBe(102);
        expect(levelAt(waveform, 100)).toBe(255);
        expect(levelAt(waveform, 150)).toBe(102);
        expect(total(waveform)).toBe(200);
    });

    test("the rumble ramps between its points", () => {
        const waveform = toWaveform(pattern([], [[0, 0], [100, 1], [200, 0]]));
        expect(levelAt(waveform, 50)).toBe(128);
        expect(levelAt(waveform, 100)).toBe(255);
        expect(levelAt(waveform, 150)).toBe(128);
    });

    test("lower hits last longer, for a heavier thud", () => {
        const sharp = toWaveform(pattern([[0, 1, 0.9]]));
        const heavy = toWaveform(pattern([[0, 1, 0.2]]));
        expect(total(heavy)).toBeGreaterThan(total(sharp));
    });

    test("a roll of hits off the step grid keeps every hit", () => {
        const hits = Array.from({ length: 8 }, (_, index) => [index * 42, 1, 0.8]);
        const waveform = toWaveform(pattern(hits, [[0, 0.2], [340, 0.2]]));
        for (const [time] of hits) expect(levelAt(waveform, Math.ceil(time / 10) * 10)).toBe(255);
    });

    test("equal steps merge", () => {
        const waveform = toWaveform(pattern([], [[0, 0.5], [300, 0.5]]));
        expect(waveform).toEqual({ timings: [300], amplitudes: [128] });
    });
});
