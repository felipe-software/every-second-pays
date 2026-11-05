import { Platform } from "react-native";

export const HAS_TAB_DOCK = Platform.OS === "android" || Platform.OS === "web";
