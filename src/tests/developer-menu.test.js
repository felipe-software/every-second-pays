import { beforeEach, expect, mock, test } from "bun:test";

const saved = new Map();
mock.module("expo-sqlite/kv-store", () => ({
    default: {
        getItem: async (key) => saved.get(key) ?? null,
        setItem: async (key, value) => {
            saved.set(key, value);
        },
    },
}));

const { TAP_STREAK_GAP_MS, UNLOCK_TAPS, useDeveloperStore } = await import("../features/developer/store");

function tapTimes(count, start = 1_000, gap = 200) {
    let unlockedAt = -1;
    for (let index = 0; index < count; index += 1) {
        if (useDeveloperStore.getState().tap(start + index * gap)) unlockedAt = index + 1;
    }
    return unlockedAt;
}

beforeEach(async () => {
    saved.clear();
    useDeveloperStore.setState({ unlocked: false, hydrated: false, streak: 0, lastTapAt: 0 });
    await useDeveloperStore.getState().load();
});

test("twenty taps in a row unlock the developer menu and save it", async () => {
    expect(tapTimes(UNLOCK_TAPS - 1)).toBe(-1);
    expect(useDeveloperStore.getState().unlocked).toBe(false);

    expect(useDeveloperStore.getState().tap(1_000 + (UNLOCK_TAPS - 1) * 200)).toBe(true);
    expect(useDeveloperStore.getState().unlocked).toBe(true);
    await Promise.resolve();
    expect(saved.get("developer-menu")).toBe("on");
});

test("a pause between taps restarts the count", () => {
    tapTimes(UNLOCK_TAPS - 1);
    const late = 1_000 + (UNLOCK_TAPS - 2) * 200 + TAP_STREAK_GAP_MS + 1;
    expect(useDeveloperStore.getState().tap(late)).toBe(false);
    expect(useDeveloperStore.getState().streak).toBe(1);
    expect(useDeveloperStore.getState().unlocked).toBe(false);
});

test("another twenty taps hide it again", () => {
    tapTimes(UNLOCK_TAPS);
    expect(useDeveloperStore.getState().unlocked).toBe(true);
    tapTimes(UNLOCK_TAPS, 50_000);
    expect(useDeveloperStore.getState().unlocked).toBe(false);
    expect(saved.get("developer-menu")).toBe("off");
});

test("a saved unlock survives a restart", async () => {
    saved.set("developer-menu", "on");
    useDeveloperStore.setState({ unlocked: false, hydrated: false });
    await useDeveloperStore.getState().load();
    expect(useDeveloperStore.getState().unlocked).toBe(true);
});

test("taps before the saved state loads are ignored", () => {
    useDeveloperStore.setState({ hydrated: false });
    expect(tapTimes(UNLOCK_TAPS)).toBe(-1);
    expect(useDeveloperStore.getState().unlocked).toBe(false);
});
