import { captureAdb } from "./capture-clock.mjs";

const APP_ID = "software.felipe.everysecondpays";

const adb = captureAdb();

adb("shell", "pm", "clear", APP_ID);
adb("shell", "monkey", "-p", APP_ID, "-c", "android.intent.category.LAUNCHER", "1");
