import "../global.css";

import {
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    useFonts,
} from "@expo-google-fonts/archivo";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useAppearanceSync } from "@/features/appearance/use-appearance-sync";
import { useEarningsTheme } from "@/features/earnings/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const appearanceReady = useAppearanceSync();
    const { colors } = useEarningsTheme();
    const [fontsLoaded] = useFonts({
        Archivo: Archivo_400Regular,
        "Archivo-Medium": Archivo_500Medium,
        "Archivo-SemiBold": Archivo_600SemiBold,
        "Archivo-Bold": Archivo_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded && appearanceReady) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, appearanceReady]);

    if (!fontsLoaded || !appearanceReady) return null;

    return (
        <KeyboardProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="settings" options={{ animation: "ios_from_right" }} />
            </Stack>
        </KeyboardProvider>
    );
}
