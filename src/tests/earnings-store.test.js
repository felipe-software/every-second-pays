import { beforeEach, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";

const sqlite = new Database(":memory:");
let failRead = false;
let failWrite = false;
let holdAppearanceWrite = false;
let releaseAppearanceWrite;
mock.module("expo-sqlite", () => ({
    openDatabaseAsync: async () => ({
        execAsync: async (sql) => sqlite.exec(sql),
        closeAsync: async () => {},
        getAllAsync: async (sql) => {
            if (failRead) throw new Error("read failed");
            return sqlite.query(sql).all();
        },
        runAsync: async (sql, ...params) => {
            if (holdAppearanceWrite && sql.includes("app_preferences")) {
                await new Promise((resolve) => { releaseAppearanceWrite = resolve; });
            }
            if (failWrite) throw new Error("write failed");
            const result = sqlite.query(sql).run(...params);
            return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
        },
    }),
}));

const { useEarningsStore: store } = await import("../features/earnings/store");
const { useAppearanceStore: appearanceStore } = await import("../features/appearance/store");
const draft = {
    name: "Client's salary",
    amount: "5200",
    frequency: "month",
    days: [1, 2, 3, 4, 5],
    shifts: [{ start: 540, end: 1020 }],
};
const resetMemory = () => store.setState({ sources: [], ready: false, loading: false, saving: false, loadError: false });
const resetAppearance = () => appearanceStore.setState({
    appearance: { mode: "system", palette: "green" },
    hydrated: false,
    loading: false,
    saving: false,
    loadError: false,
});

beforeEach(async () => {
    failRead = false;
    failWrite = false;
    holdAppearanceWrite = false;
    releaseAppearanceWrite = undefined;
    resetMemory();
    await store.getState().load();
    sqlite.exec("DELETE FROM payment_sources");
    sqlite.exec("DELETE FROM app_preferences");
    resetMemory();
    resetAppearance();
});

test("starts empty without seeds", async () => {
    await store.getState().load();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().sources).toEqual([]);
});

test("create, edit and delete survive store rehydration", async () => {
    await store.getState().load();
    await store.getState().save(draft);
    const saved = store.getState().sources[0];
    expect(saved.amount).toBe(5200);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources).toEqual([saved]);
    await store.getState().save({ ...draft, amount: "6000", days: [0, 6] }, saved.id);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources[0]).toMatchObject({ id: saved.id, amount: 6000, days: [0, 6] });
    await store.getState().remove(saved.id);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources).toEqual([]);
});

test("one-time payments remember when they landed", async () => {
    await store.getState().load();
    const bonus = { ...draft, name: "Bonus", amount: "500", frequency: "once", when: "today" };
    const before = Date.now();
    await store.getState().save(bonus);
    const saved = store.getState().sources[0];
    expect(saved.paidAt).toBeGreaterThanOrEqual(before);
    expect(saved.paidAt).toBeLessThanOrEqual(Date.now());

    await store.getState().save({ ...bonus, amount: "600", paidAt: 1 }, saved.id);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources[0]).toMatchObject({ amount: 600, paidAt: saved.paidAt });

    await store.getState().save({ ...bonus, when: "later" }, saved.id);
    expect(store.getState().sources[0].paidAt).toBeUndefined();
    await store.getState().save({ ...bonus, frequency: "month" }, saved.id);
    expect(store.getState().sources[0].paidAt).toBeUndefined();

    await store.getState().save(bonus, saved.id);
    expect(store.getState().sources[0].paidAt).toBeGreaterThanOrEqual(saved.paidAt);
});

test("sources keep their currency, and legacy ones adopt one", async () => {
    await store.getState().load();
    await store.getState().save({ ...draft, currency: "EUR" });
    // Saved before currencies existed.
    sqlite.query("INSERT INTO payment_sources (payload) VALUES (?)").run(JSON.stringify({ ...draft, amount: 100 }));
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources.map((source) => source.currency)).toEqual(["EUR", undefined]);
    await expect(store.getState().save({ ...draft, currency: " " })).rejects.toThrow();
    await expect(store.getState().save({ ...draft, currency: "1234567" })).rejects.toThrow();

    await store.getState().adoptCurrency("BRL");
    expect(store.getState().sources.map((source) => source.currency)).toEqual(["EUR", "BRL"]);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources.map((source) => source.currency)).toEqual(["EUR", "BRL"]);
});

test("read failure is retryable and blocks writes", async () => {
    failRead = true;
    await store.getState().load();
    expect(store.getState().loadError).toBe(true);
    expect(store.getState().ready).toBe(false);
    await expect(store.getState().save(draft)).rejects.toThrow();
    failRead = false;
    await store.getState().load();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().loadError).toBe(false);
});

test("failed writes preserve memory and saved data", async () => {
    await store.getState().load();
    await store.getState().save(draft);
    const saved = store.getState().sources[0];
    failWrite = true;
    await expect(store.getState().save({ ...draft, amount: "6000" }, saved.id)).rejects.toThrow();
    await expect(store.getState().remove(saved.id)).rejects.toThrow();
    expect(store.getState().sources).toEqual([saved]);
    expect(store.getState().saving).toBe(false);
    resetMemory();
    await store.getState().load();
    expect(store.getState().sources).toEqual([saved]);
});

test("rejects invalid amounts and duplicate concurrent submissions", async () => {
    await store.getState().load();
    await expect(store.getState().save({ ...draft, amount: "NaN" })).rejects.toThrow();
    const first = store.getState().save(draft);
    await expect(store.getState().save(draft)).rejects.toThrow();
    await first;
    expect(store.getState().sources).toHaveLength(1);
});

test("applies appearance immediately while persistence is pending", async () => {
    await appearanceStore.getState().load();
    holdAppearanceWrite = true;

    const update = appearanceStore.getState().update({ palette: "blue" });

    expect(appearanceStore.getState()).toMatchObject({
        appearance: { mode: "system", palette: "blue" },
        saving: true,
    });

    await Promise.resolve();
    releaseAppearanceWrite();
    await update;
    resetAppearance();
    await appearanceStore.getState().load();
    expect(appearanceStore.getState()).toMatchObject({
        appearance: { mode: "system", palette: "blue" },
        saving: false,
    });
});

test("keeps the last appearance when changes arrive during a save", async () => {
    await appearanceStore.getState().load();
    holdAppearanceWrite = true;

    const first = appearanceStore.getState().update({ palette: "blue" });
    const second = appearanceStore.getState().update({ palette: "rose" });
    expect(appearanceStore.getState().appearance.palette).toBe("rose");

    await Promise.resolve();
    holdAppearanceWrite = false;
    releaseAppearanceWrite();
    await Promise.all([first, second]);
    expect(appearanceStore.getState().saving).toBe(false);

    resetAppearance();
    await appearanceStore.getState().load();
    expect(appearanceStore.getState().appearance.palette).toBe("rose");
});

test("restores the previous appearance when persistence fails", async () => {
    await appearanceStore.getState().load();
    failWrite = true;

    await expect(appearanceStore.getState().update({ mode: "dark" })).rejects.toThrow("write failed");

    expect(appearanceStore.getState()).toMatchObject({
        appearance: { mode: "system", palette: "green" },
        saving: false,
    });
});

test("does not persist an unchanged appearance", async () => {
    await appearanceStore.getState().load();

    await appearanceStore.getState().update({ mode: "system", palette: "green" });

    expect(sqlite.query("SELECT * FROM app_preferences").all()).toEqual([]);
    expect(appearanceStore.getState().saving).toBe(false);
});
