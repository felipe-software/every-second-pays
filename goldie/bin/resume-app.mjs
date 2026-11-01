import { captureAdb } from "./capture-clock.mjs";

// Brings the running app back without restarting it, which republishes the widget schedule.
captureAdb()("shell", "monkey", "-p", "software.felipe.everysecondpays", "-c", "android.intent.category.LAUNCHER", "1");
