import "../global.css";

import {
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    useFonts,
} from "@expo-google-fonts/archivo";
import { NavigationBar } from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTabs from "@/components/app-tabs";
import { useAppearanceSync } from "@/features/appearance/use-appearance-sync";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useHapticsWarmup } from "@/features/haptics/haptics";
import { I18nProvider } from "@/features/i18n/i18n";
import { useLanguageStore } from "@/features/i18n/store";

SplashScreen.preventAutoHideAsync();

function SystemBars() {
    const { isDark } = useEarningsTheme();

    return (
        <>
            <StatusBar style={isDark ? "light" : "dark"} />
            <NavigationBar style="auto" />
        </>
    );
}

function StatusBarTransparencyProbe() {
    const insets = useSafeAreaInsets();

    if (Platform.OS !== "android") return null;

    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                left: 0,
                zIndex: 999,
                height: Math.max(insets.top, 32),
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text style={{ color: "#FF00A8", fontSize: 12, fontWeight: "700" }}>teste</Text>
        </View>
    );
}

export default function RootLayout() {
    useHapticsWarmup();
    const appearanceReady = useAppearanceSync();
    const { colors } = useEarningsTheme();
    const languageReady = useLanguageStore((state) => state.hydrated);
    const loadLanguage = useLanguageStore((state) => state.load);
    const [fontsLoaded] = useFonts({
        Archivo: Archivo_400Regular,
        "Archivo-Medium": Archivo_500Medium,
        "Archivo-SemiBold": Archivo_600SemiBold,
        "Archivo-Bold": Archivo_700Bold,
    });

    useEffect(() => { void loadLanguage(); }, [loadLanguage]);

    useEffect(() => {
        if (fontsLoaded && appearanceReady && languageReady) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, appearanceReady, languageReady]);

    if (!fontsLoaded || !appearanceReady || !languageReady) return null;

    return (
        <I18nProvider>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
                <SystemBars />
                <KeyboardProvider>
                    <AppTabs />
                </KeyboardProvider>
                <StatusBarTransparencyProbe />
            </GestureHandlerRootView>
        </I18nProvider>
    );
}
