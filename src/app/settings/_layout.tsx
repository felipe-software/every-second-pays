import { Stack } from "expo-router";

// Every screen paints its own canvas; a themed color here would rebuild the navigator on each theme change.
const SCREEN_OPTIONS = {
    headerShown: false,
    animation: "slide_from_right",
    contentStyle: { backgroundColor: "transparent" },
} as const;

export default function SettingsLayout() {
    return <Stack screenOptions={SCREEN_OPTIONS} />;
}
