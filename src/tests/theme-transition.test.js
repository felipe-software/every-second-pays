import { beforeEach, expect, mock, test } from "bun:test";

let flipSucceeds = true;
let calls = [];
const native = {
    begin: (frameKey) => {
        calls.push(["begin", frameKey]);
        return true;
    },
    commit: (...args) => calls.push(["commit", ...args]),
    flip: (...args) => {
        calls.push(["flip", ...args]);
        return flipSucceeds;
    },
    endBurst: (...args) => calls.push(["endBurst", ...args]),
    clearFrames: () => {},
};
mock.module("expo", () => ({ requireOptionalNativeModule: () => native }));

const { attachCommitScheduler, commitPendingTransition, createLookTransition, flushLookBurst, revealChange } =
    await import("../../modules/theme-transition/src/transition");

const look = createLookTransition();
const ORIGIN = { x: 10, y: 20 };
let renders = 0;
let applied = [];

const change = (from, to, overrides = {}) =>
    look.transitionLook({
        look: to,
        from,
        to,
        apply: () => applied.push(to),
        origin: ORIGIN,
        reduceMotion: false,
        ...overrides,
    });
const callsNamed = (name) => calls.filter(([called]) => called === name);
const afterMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
    flushLookBurst();
    commitPendingTransition();
    await afterMicrotasks();
    flipSucceeds = true;
    calls = [];
    applied = [];
    renders = 0;
    attachCommitScheduler(() => {
        renders += 1;
    });
});

test("reveals through React when the frames aren't cached yet", async () => {
    flipSucceeds = false;

    change("light", "dark");

    expect(applied).toEqual(["dark"]);
    expect(renders).toBe(1);
    expect(look.shownLook("light")).toBe("light");

    commitPendingTransition();
    expect(callsNamed("begin")).toEqual([["begin", "light"]]);

    await afterMicrotasks();
    expect(callsNamed("commit")).toEqual([["commit", 10, 20, 650, 3]]);
});

test("flips natively during a burst and renders only the last look", async () => {
    change("light", "dark");
    expect(look.shownLook("light")).toBe("dark");
    change("light", "light");
    expect(look.shownLook("light")).toBe("light");
    change("light", "dark");
    expect(look.shownLook("light")).toBe("dark");

    expect(callsNamed("flip")).toEqual([
        ["flip", "light", "dark", 10, 20, 650],
        ["flip", "dark", "light", 10, 20, 650],
        ["flip", "light", "dark", 10, 20, 650],
    ]);
    expect(applied).toEqual([]);
    expect(renders).toBe(0);

    flushLookBurst();
    expect(applied).toEqual(["dark"]);
    expect(renders).toBe(1);
    expect(look.shownLook("light")).toBe("dark");

    commitPendingTransition();
    expect(look.shownLook("light")).toBe("light");

    await afterMicrotasks();
    expect(callsNamed("endBurst")).toEqual([["endBurst", 3, 120]]);
    expect(callsNamed("begin")).toEqual([]);
});

test("skips the render when a burst ends on the look already rendered", () => {
    change("light", "dark");
    change("light", "light");

    flushLookBurst();

    expect(applied).toEqual([]);
    expect(renders).toBe(0);
    expect(callsNamed("endBurst")).toEqual([["endBurst", 0, 120]]);
    expect(look.shownLook("light")).toBe("light");
});

test("settles by itself once the taps stop", async () => {
    change("light", "dark", { durationMs: 0 });
    expect(applied).toEqual([]);

    await sleep(80);

    expect(applied).toEqual(["dark"]);
    expect(renders).toBe(1);
});

test("keeps the burst going when more taps land before the quiet timer", async () => {
    change("light", "dark", { durationMs: 40 });
    await sleep(50);
    change("light", "light", { durationMs: 40 });
    await sleep(50);

    expect(applied).toEqual([]);
    expect(callsNamed("flip").length).toBe(2);
    flushLookBurst();
});

test("ignores a change to the look already showing during a burst", () => {
    change("light", "dark");
    change("light", "dark");

    expect(callsNamed("flip").length).toBe(1);
});

test("applies directly with reduced motion", () => {
    change("light", "dark", { reduceMotion: true });

    expect(applied).toEqual(["dark"]);
    expect(calls).toEqual([]);
    expect(renders).toBe(0);
});

test("applies directly when the boundary isn't mounted", () => {
    attachCommitScheduler(null);

    change("light", "dark");

    expect(applied).toEqual(["dark"]);
    expect(calls).toEqual([]);
});

test("a reveal settles the running burst first", async () => {
    change("light", "dark");
    const revealed = [];

    revealChange(() => revealed.push("preview"), ORIGIN, false);

    expect(applied).toEqual(["dark"]);
    expect(revealed).toEqual(["preview"]);
    expect(renders).toBe(2);

    commitPendingTransition();
    await afterMicrotasks();
    expect(callsNamed("endBurst")).toEqual([["endBurst", 3, 120]]);
    expect(callsNamed("begin")).toEqual([["begin", null]]);
    expect(callsNamed("commit")).toEqual([["commit", 10, 20, 650, 3]]);
});

test("a surface doesn't read another surface's burst", () => {
    const other = createLookTransition();

    change("light", "dark");

    expect(other.shownLook("committed")).toBe("committed");
});
