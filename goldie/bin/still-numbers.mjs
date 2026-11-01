import { captureAdb } from "./capture-clock.mjs";

// A screenshot of counters that tick twice a second otherwise catches their digits mid-roll.
captureAdb()("shell", "settings", "put", "global", "animator_duration_scale", "0");
