import { describe, expect, test } from "bun:test";

import bell from "../assets/onboarding/notifications.json";
import { ALLOWED, BELL_CUES, COIN_EVERY, DECLINED, ENTER } from "../features/onboarding/bell-timeline";

const frames = (ms) => Math.round((ms * bell.animation.fr) / 1000);
const within = ([from, to], frame) => frame >= from && frame <= to;

describe("the service bell's art", () => {
    test("its scenes last as long as the timeline says", () => {
        const { intro, loop, allowed, declined } = bell.segments;
        expect(intro[1] - intro[0]).toBe(frames(ENTER));
        expect(loop[1] - loop[0]).toBe(frames(COIN_EVERY) * 2);
        expect(allowed[1] - allowed[0]).toBe(frames(ALLOWED.length));
        expect(declined[1] - declined[0]).toBe(frames(DECLINED.length));
    });

    test("the answers' last frames aren't shared with another scene", () => {
        const { loop, allowed, declined } = bell.segments;
        expect(allowed[0]).toBeGreaterThan(loop[1]);
        expect(declined[0]).toBeGreaterThan(allowed[1]);
        expect(bell.animation.op).toBeGreaterThan(declined[1]);
    });

    test("every cue fires inside its scene, at its time", () => {
        const scenes = { enter: "intro", ask: "loop", allowed: "allowed", declined: "declined" };
        for (const { frame, name } of bell.cues) {
            const scene = bell.segments[scenes[name]];
            expect(within(scene, frame)).toBe(true);
            expect((frame - scene[0]) % frames(COIN_EVERY)).toBe(frames(BELL_CUES[name]));
        }
    });

    test("every token has a value for every look", () => {
        for (const token of bell.tokens) expect(token).toHaveLength(bell.looks.length);
    });
});
