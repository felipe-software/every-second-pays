import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { foldGradientMattes } from "../../scripts/onboarding-lottie/gradient-mattes.mjs";
import { splitIdleBlurs } from "../../scripts/onboarding-lottie/idle-blurs.mjs";

const ASSETS = join(import.meta.dir, "../assets/onboarding");

function jsonFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return jsonFiles(path);
        return name.endsWith(".json") ? [path] : [];
    });
}

const still = (value) => ({ a: 0, k: value });
const keyed = (...keys) => ({
    a: 1,
    k: keys.map(([t, s]) => ({ t, s: Array.isArray(s) ? s : [s], o: { x: 0.4, y: 0 }, i: { x: 0.6, y: 1 } })),
});
const identity = { ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) };

function blurredLayer(blurriness) {
    return {
        ind: 1,
        ty: 4,
        ip: 0,
        op: 100,
        ks: {},
        shapes: [],
        ef: [{ ty: 29, en: 1, ef: [{ mn: "ADBE Gaussian Blur 2-0001", v: blurriness }] }],
    };
}

function counterColumn({ rectPosition, opacity }) {
    const transform = { a: still([0, 0, 0]), p: { s: true, x: still(10), y: still(20) }, o: opacity };
    const matte = {
        ind: 2,
        ty: 4,
        td: 1,
        ip: 0,
        op: 100,
        ks: transform,
        shapes: [
            {
                ty: "gr",
                it: [
                    { ty: "rc", p: rectPosition, s: still([40, 100]), r: still(0) },
                    {
                        ty: "gf",
                        t: 1,
                        o: still(100),
                        s: still([20, 0]),
                        e: still([20, 100]),
                        g: { p: 2, k: still([0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0.2, 1, 0.8, 1, 1, 0]) },
                    },
                    identity,
                ],
            },
        ],
    };
    const digits = { ind: 1, ty: 0, tt: 1, refId: "strip", ip: 0, op: 100, w: 46, h: 100, ks: { ...transform } };
    const strip = {
        id: "strip",
        layers: [
            {
                ind: 1,
                ty: 4,
                ip: 0,
                op: 100,
                ks: {
                    a: still([20, 500, 0]),
                    p: { s: true, x: still(20), y: keyed([0, 500], [50, 300]) },
                    s: still([100, 100, 100]),
                },
                shapes: [{ ty: "gr", it: [{ ty: "sh" }, { ty: "fl", c: still("#0"), o: still(100), r: 1 }, identity] }],
            },
        ],
    };
    return { layers: [matte, digits], assets: [strip] };
}

describe("onboarding animation optimizations", () => {
    test("the shipped animations are already optimized", () => {
        for (const path of jsonFiles(ASSETS)) {
            const source = JSON.parse(readFileSync(path, "utf8"));
            const animation = JSON.parse(source.animation);
            const tokens = structuredClone(source.tokens);
            expect(splitIdleBlurs(animation), path).toBe(0);
            expect(foldGradientMattes(animation, tokens), path).toBe(0);
            expect(JSON.stringify(animation), path).toBe(source.animation);
        }
    });

    test("a blur that settles at zero hands off to a copy without it", () => {
        const animation = { layers: [blurredLayer(keyed([0, 16], [20, 0]))] };
        expect(splitIdleBlurs(animation)).toBe(1);
        const [blurred, plain] = animation.layers;
        expect([blurred.ip, blurred.op, Boolean(blurred.ef)]).toEqual([0, 20, true]);
        expect([plain.ip, plain.op, Boolean(plain.ef)]).toEqual([20, 100, false]);
        expect(plain.ind).not.toBe(blurred.ind);
    });

    test("a blur that never rests at zero stays as it is", () => {
        const animation = { layers: [blurredLayer(keyed([0, 16], [20, 4]))] };
        expect(splitIdleBlurs(animation)).toBe(0);
        expect(animation.layers).toHaveLength(1);
    });

    test("a still gradient matte becomes the strip's own fill", () => {
        const animation = counterColumn({ rectPosition: still([20, 50]), opacity: still(100) });
        const tokens = [[[0.1, 0.2, 0.3, 1]]];
        expect(foldGradientMattes(animation, tokens)).toBe(1);
        expect(animation.layers).toHaveLength(1);
        const [digits] = animation.layers;
        expect(digits.tt).toBeUndefined();
        const fill = animation.assets[0].layers[0].shapes[0].it[1];
        expect(fill.ty).toBe("gf");
        expect(fill.s.k.map((key) => key.s[1])).toEqual([0, 200]);
        expect(tokens).toHaveLength(2);
    });

    test("a wiping matte is kept until it settles, then folded", () => {
        const animation = counterColumn({ rectPosition: keyed([0, [0, 50]], [30, [20, 50]]), opacity: still(100) });
        expect(foldGradientMattes(animation, [[[0.1, 0.2, 0.3, 1]]])).toBe(1);
        const [matte, wiping, folded] = animation.layers;
        expect(wiping.tt).toBe(1);
        expect([wiping.op, folded.ip, folded.tt]).toEqual([30, 30, undefined]);
        expect(matte.ks.o.k.at(-1)).toEqual({ t: 30, s: [0] });
    });
});
