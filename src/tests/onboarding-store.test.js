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

const savedSources = [{ id: 1, payload: JSON.stringify({ name: "Old job", frequency: "hour", amount: 25 }) }];
mock.module("expo-sqlite", () => ({
    openDatabaseAsync: async () => ({
        execAsync: async () => {},
        closeAsync: async () => {},
        getAllAsync: async () => savedSources,
        runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    }),
}));

const { useOnboardingStore } = await import("../features/onboarding/store");
const { default: appConfig } = await import("../../app.config");

beforeEach(() => {
    saved.clear();
    useOnboardingStore.setState({ status: "unknown", covering: false });
});

test("people updating from a version before the onboarding see it, even with saved jobs", async () => {
    await useOnboardingStore.getState().load();
    expect(useOnboardingStore.getState().status).toBe("pending");
    expect(saved.has("onboarding")).toBe(false);
});

test("finishing the onboarding saves it and skips it on the next launch", async () => {
    await useOnboardingStore.getState().load();
    useOnboardingStore.getState().complete();
    await Promise.resolve();
    expect(saved.get("onboarding")).toBe("done");

    useOnboardingStore.setState({ status: "unknown" });
    await useOnboardingStore.getState().load();
    expect(useOnboardingStore.getState().status).toBe("done");
});

test("android never restores app data from a backup after a reinstall", () => {
    expect(appConfig().android?.allowBackup).toBe(false);
});
