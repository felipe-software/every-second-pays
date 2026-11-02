import { captureAdb, setCaptureClock } from "./capture-clock.mjs";

// Counters stand still before a shift; while they tick, a tree read takes ~9s on a software emulator.
setCaptureClock("0600");
const adb = captureAdb();
adb("shell", "settings", "put", "global", "animator_duration_scale", "1");
adb("shell", "settings", "put", "global", "transition_animation_scale", "1");
