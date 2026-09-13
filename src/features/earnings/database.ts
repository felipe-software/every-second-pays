import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { PaymentSource } from "./model";

let database: Promise<SQLiteDatabase> | undefined;

function getDatabase() {
    database ??= (async () => {
        const db = await openDatabaseAsync("earnings.db");
        try {
            await db.execAsync(`
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS payment_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS app_preferences (
                    key TEXT PRIMARY KEY NOT NULL,
                    payload TEXT NOT NULL
                );
            `);
            return db;
        } catch (error) {
            await db.closeAsync();
            throw error;
        }
    })().catch((error) => {
        database = undefined;
        throw error;
    });
    return database;
}

export async function loadPaymentSources(): Promise<PaymentSource[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; payload: string }>(
        "SELECT id, payload FROM payment_sources ORDER BY id",
    );
    return rows.map(({ id, payload }) => ({ ...JSON.parse(payload), id }));
}

export async function writePaymentSource(source: Omit<PaymentSource, "id">, id?: number): Promise<PaymentSource> {
    const db = await getDatabase();
    const payload = JSON.stringify(source);
    if (id != null) {
        const result = await db.runAsync("UPDATE payment_sources SET payload = ? WHERE id = ?", payload, id);
        if (!result.changes) throw new Error("Payment source no longer exists.");
        return { ...source, id };
    }
    const result = await db.runAsync("INSERT INTO payment_sources (payload) VALUES (?)", payload);
    return { ...source, id: result.lastInsertRowId };
}

export async function deletePaymentSource(id: number) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM payment_sources WHERE id = ?", id);
}

export async function loadAppearancePreference(): Promise<unknown> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM app_preferences WHERE key = 'appearance'",
    );
    return rows.length ? JSON.parse(rows[0].payload) : undefined;
}

export async function writeAppearancePreference(value: { mode: string; palette: string }) {
    const db = await getDatabase();
    await db.runAsync(
        "INSERT INTO app_preferences (key, payload) VALUES ('appearance', ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload",
        JSON.stringify(value),
    );
}
