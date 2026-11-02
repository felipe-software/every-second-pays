import { captureAdb } from "./capture-clock.mjs";

// The dashboard's digits run on Reanimated, which reads this at app start, so set it before launch.
captureAdb()("shell", "settings", "put", "global", "transition_animation_scale", "0");
