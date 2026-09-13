import { beforeEach, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";

// Exercise the production queries against SQLite without a native RN runtime.
const sqlite = new Database(":memory:");
let failRead = false;
let failWrite = false;
mock.module("expo-sqlite", () => ({
    openDatabaseAsync: async () => ({
        execAsync: async (sql) => sqlite.exec(sql),
        closeAsync: async () => {},
        getAllAsync: async (sql) => {
            if (failRead) throw new Error("read failed");
            return sqlite.query(sql).all();
        },
        runAsync: async (sql, ...params) => {
            if (failWrite) throw new Error("write failed");
            const result = sqlite.query(sql).run(...params);
            return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
        },
    }),
}));

const { useEarningsStore: store } = await import("../src/features/earnings/store");
const draft = {
    name: "Client's salary",
    amount: "5200",
    frequency: "month",
    days: [1, 2, 3, 4, 5],
    shifts: [{ start: 540, end: 1020 }],
};
const resetMemory = () => store.setState({ sources: [], ready: false, loading: false, saving: false, loadError: false });

beforeEach(async () => {
    failRead = false;
    failWrite = false;
    resetMemory();
    await store.getState().load();
    sqlite.exec("DELETE FROM payment_sources");
    resetMemory();
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
