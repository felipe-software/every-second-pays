import { execFileSync } from "node:child_process";

const AVD_NAME = "Goldie_Pixel_8_API_36";
const WEDNESDAY_NOV_4 = "1104";
const YEAR = "2026";

const run = (...args) => execFileSync("adb", args, { encoding: "utf8" }).trim();

export function captureAdb() {
    const serial = run("devices")
        .split("\n")
        .slice(1)
        .map((line) => line.split(/\s+/))
        .filter(([, state]) => state === "device")
        .map(([candidate]) => candidate)
        .find((candidate) => run("-s", candidate, "emu", "avd", "name").split("\n")[0].trim() === AVD_NAME);
    if (!serial) throw new Error(`${AVD_NAME} is not running`);

    const adb = (...args) => run("-s", serial, ...args);
    // Only Google APIs images allow this, not Google Play ones; the clock and the app reset need it.
    adb("root");
    adb("wait-for-device");
    return adb;
}

export function setCaptureClock(hhmm) {
    captureAdb()("shell", "date", `${WEDNESDAY_NOV_4}${hhmm}${YEAR}.00`);
}
