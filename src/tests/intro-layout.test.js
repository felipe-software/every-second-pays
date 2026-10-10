import { describe, expect, mock, test } from "bun:test";

mock.module("react-native-reanimated", () => ({
    cubicBezier: () => () => 0,
    Easing: { bezierFn: () => (progress) => progress },
}));

const intro = (await import("../assets/onboarding/intro.json")).default;
const { artShift } = await import("../features/onboarding/intro-timeline");

const FPS = 60;

describe("the intro's art shift", () => {
    test("the labels the app draws move with the art's stage layer", () => {
        const { layers } = intro.animation;
        const children = (layer) => layers.filter((child) => child.parent === layer.ind).length;
        const stage = layers.find((layer) => layer.ty === 3 && children(layer) > 100);
        const keys = stage.ks.p.y.k;
        expect(keys.length).toBeGreaterThan(1);
        for (const key of keys) expect(artShift((key.t * 1000) / FPS)).toBeCloseTo(key.s[0], 5);
    });
});
