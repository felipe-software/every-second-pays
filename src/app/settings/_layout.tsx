import { Stack } from "expo-router";

// Screens paint their own canvas; a themed color here would rebuild the navigator on theme change.
const SCREEN_OPTIONS = {
    headerShown: false,
    animation: "slide_from_right",
    contentStyle: { backgroundColor: "transparent" },
} as const;

export default function SettingsLayout() {
    return <Stack screenOptions={SCREEN_OPTIONS} />;
}
