import { execFileSync, spawn } from "node:child_process";
import { homedir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

import { AVD_NAME, captureAdb } from "./capture-clock.mjs";

const TIMEOUT_MS = 240_000;
const EMULATOR = `${process.env.ANDROID_HOME ?? `${homedir()}/Android/Sdk`}/emulator/emulator`;
const FLAGS = ["-no-window", "-noaudio", "-no-boot-anim", "-gpu", "auto", "-netfast", "-no-metrics"];

async function waitUntil(condition, failure) {
    const deadline = Date.now() + TIMEOUT_MS;
    while (!condition()) {
        if (Date.now() > deadline) throw new Error(failure);
        await sleep(2000);
    }
}

function isRunning() {
    try {
        execFileSync("pgrep", ["-f", `[-]avd ${AVD_NAME}`], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function bootFinished() {
    try {
        const adb = captureAdb();
        return adb("shell", "getprop", "sys.boot_completed") === "1" && adb("shell", "dumpsys", "window").includes("mCurrentFocus=Window");
    } catch {
        return false;
    }
}

export async function startEmulator() {
    // Detached, so an interrupted capture leaves the emulator up.
    if (!isRunning()) spawn(EMULATOR, ["-avd", AVD_NAME, ...FLAGS], { detached: true, stdio: "ignore" }).unref();
    await waitUntil(bootFinished, `${AVD_NAME} did not finish booting`);
}

export async function restartEmulator() {
    captureAdb()("emu", "kill");
    await waitUntil(() => !isRunning(), `${AVD_NAME} did not shut down`);
    await startEmulator();
}
