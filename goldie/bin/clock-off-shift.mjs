import { captureAdb, setCaptureClock } from "./capture-clock.mjs";

// Before every shift the counters stand still; while they tick, each tree read takes about 9s on a software-rendered emulator.
setCaptureClock("0600");
captureAdb()("shell", "settings", "put", "global", "animator_duration_scale", "1");
