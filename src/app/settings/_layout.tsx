import { Stack } from "expo-router";

import { useEarningsTheme } from "@/features/earnings/theme";

export default function SettingsLayout() {
    const { colors } = useEarningsTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: colors.canvas },
            }}
        />
    );
}
