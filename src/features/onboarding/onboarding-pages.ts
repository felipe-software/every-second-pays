import { Platform } from "react-native";

import { ARTBOARD } from "./motion";
import type { PageId } from "./onboarding-background";

export const PAGE_WIDTH = ARTBOARD.width;

// Live widgets need Android 12; elsewhere the step would promise something the app can't do.
const HAS_WIDGETS = Platform.OS === "android" && Platform.Version >= 31;
export const HAS_NOTIFICATIONS = Platform.OS === "android" && Platform.Version >= 26;
export const PAGES: PageId[] = [
    "intro",
    ...(HAS_WIDGETS ? (["widget"] as const) : []),
    "privacy",
    ...(HAS_NOTIFICATIONS ? (["notifications"] as const) : []),
    "customize",
];
export const LAST_PAGE = PAGES.length - 1;
export const CUSTOMIZE_PAGE = PAGES.indexOf("customize");
export const NOTIFICATIONS_PAGE = PAGES.indexOf("notifications");
