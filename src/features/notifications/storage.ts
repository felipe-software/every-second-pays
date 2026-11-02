import Storage from "expo-sqlite/kv-store";

import { type NotificationSettings, parseSettings, parseState, type RoutineState } from "./routine";

const SETTINGS_KEY = "notification-settings";
const STATE_KEY = "notification-routine";
const ASKED_KEY = "notification-permission-asked";

async function readParsed<T>(key: string, parse: (value: unknown) => T) {
    let stored: unknown;
    try {
        const value = await Storage.getItem(key);
        stored = value ? JSON.parse(value) : undefined;
    } catch {
        stored = undefined;
    }
    return parse(stored);
}

export function readSettings() {
    return readParsed(SETTINGS_KEY, parseSettings);
}

export async function writeSettings(settings: NotificationSettings) {
    await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function readState() {
    return readParsed(STATE_KEY, parseState);
}

let stateQueue: Promise<unknown> = Promise.resolve();

export function updateState(change: (state: RoutineState) => RoutineState) {
    const next = stateQueue.then(async () => {
        const state = change(await readState());
        await Storage.setItem(STATE_KEY, JSON.stringify(state));
        return state;
    });
    stateQueue = next.catch(() => undefined);
    return next;
}

export async function wasPermissionAsked() {
    return (await Storage.getItem(ASKED_KEY)) === "yes";
}

export async function markPermissionAsked() {
    await Storage.setItem(ASKED_KEY, "yes");
}
