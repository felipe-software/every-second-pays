import { fileURLToPath } from "node:url";

import { captureAdb } from "./capture-clock.mjs";
import { startEmulator } from "./emulator.mjs";

const WALLPAPER = fileURLToPath(new URL("../assets/wallpaper.jpg", import.meta.url));
const WALLPAPER_DIR = "/data/system/users/0";

await startEmulator();
const adb = captureAdb();

adb("shell", "settings", "put", "global", "auto_time", "0");
// Argent's taps count as stylus input, which opens Gboard's handwriting tutorial over the app.
adb("shell", "settings", "put", "secure", "stylus_handwriting_enabled", "0");

// Android has no shell command to set a wallpaper, so write the files its service reads at the next boot.
adb("push", WALLPAPER, `${WALLPAPER_DIR}/wallpaper`);
adb("shell", `cd ${WALLPAPER_DIR} && cp wallpaper wallpaper_orig && chown system:system wallpaper wallpaper_orig && chmod 600 wallpaper wallpaper_orig && restorecon wallpaper wallpaper_orig`);
