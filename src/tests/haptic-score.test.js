import { describe, expect, mock, test } from "bun:test";

mock.module("react-native-reanimated", () => ({
    cubicBezier: () => () => 0,
    Easing: { bezierFn: () => (progress) => progress },
}));
mock.module("@/features/haptics/haptics", () => ({ scoreHaptic: (score) => score }));

const { toChunks, toPattern } = await import("../features/haptics/score");
const { INTRO_HAPTICS } = await import("../features/onboarding/intro-haptics");

// What a Galaxy S24 reports.
const S24 = { click: 20, tick: 20, lowTick: 20, thud: 300, spin: 130, quickRise: 150, slowRise: 500, quickFall: 100 };

// When each primitive starts, the way Android plays a composition: each one a delay after the
// previous one ends.
function played(chunks, durations) {
    return chunks.flatMap((chunk) => {
        let time = chunk.at;
        return chunk.primitives.map((primitive, index) => {
            time += chunk.delays[index];
            const start = time;
            time += durations[primitive];
            return [start, primitive];
        });
    });
}

describe("toChunks", () => {
    test("notes land when the score says", () => {
        const score = [[0, "click", 1], [42, "tick", 0.5], [84, "tick", 0.5], [400, "thud", 1]];
        expect(played(toChunks(score, S24), S24)).toEqual(score.map(([time, primitive]) => [time, primitive]));
    });

    test("a long pause starts a new chunk, timed by the clock", () => {
        const chunks = toChunks([[0, "click", 1], [500, "click", 1]], S24);
        expect(chunks.map((chunk) => chunk.at)).toEqual([0, 500]);
    });

    test("no chunk is longer than Android plays in one go", () => {
        const roll = Array.from({ length: 25 }, (_, index) => [index * 30, "tick", 0.5]);
        const chunks = toChunks(roll, S24);
        expect(chunks.every((chunk) => chunk.primitives.length <= 10)).toBe(true);
        expect(played(chunks, S24).map(([time]) => time)).toEqual(roll.map(([time]) => time));
    });

    test("a note waits for the one still playing, or is dropped if that makes it late", () => {
        const score = [[0, "spin", 1], [90, "tick", 0.5], [120, "tick", 0.5], [300, "click", 1]];
        expect(played(toChunks(score, S24), S24)).toEqual([[0, "spin"], [130, "tick"], [300, "click"]]);
    });

    test("starting late skips what has passed and keeps the rest on time", () => {
        const score = [[0, "click", 1], [100, "click", 1], [250, "click", 1]];
        expect(played(toChunks(score, S24, 120), S24)).toEqual([[130, "click"]]);
    });
});

describe("toPattern", () => {
    test("each primitive becomes transients, scaled", () => {
        const pattern = toPattern([[100, "click", 0.5], [0, "quickFall", 1]]);
        expect(pattern.discretePattern[0]).toEqual({ time: 0, amplitude: 1, frequency: 0.6 });
        expect(pattern.discretePattern.find((hit) => hit.time === 100)).toEqual({ time: 100, amplitude: 0.5, frequency: 0.8 });
        expect(pattern.continuousPattern.amplitude).toEqual([]);
    });
});

describe("the intro's score", () => {
    test("plays every note within a few ms of its moment", () => {
        const notes = [...INTRO_HAPTICS].sort((a, b) => a[0] - b[0]);
        const chunks = toChunks(notes, S24);
        const starts = played(chunks, S24);
        expect(starts).toHaveLength(notes.length);
        starts.forEach(([start], index) => expect(Math.abs(start - notes[index][0])).toBeLessThanOrEqual(5));
        expect(chunks.every((chunk) => chunk.primitives.length <= 10)).toBe(true);
    });
});
