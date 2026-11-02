import Storage from "expo-sqlite/kv-store";

import {
    type NotificationSettings,
    parseSettings,
    parseState,
    type RoutineState,
} from "./routine";

const SETTINGS_KEY = "notification-settings";
const STATE_KEY = "notification-routine";
const ASKED_KEY = "notification-permission-asked";

async function readJson(key: string): Promise<unknown> {
    try {
        const value = await Storage.getItem(key);
        return value ? JSON.parse(value) : undefined;
    } catch {
        return undefined;
    }
}

export async function readSettings() {
    return parseSettings(await readJson(SETTINGS_KEY));
}

export async function writeSettings(settings: NotificationSettings) {
    await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function readState() {
    return parseState(await readJson(STATE_KEY));
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
