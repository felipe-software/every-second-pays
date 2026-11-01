import { captureAdb } from "./capture-clock.mjs";

// The dashboard's digits run on Reanimated, which reads this when the app starts, so set it before a launch.
captureAdb()("shell", "settings", "put", "global", "transition_animation_scale", "0");
