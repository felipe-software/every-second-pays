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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AppTabs from "@/components/app-tabs";
import { useAppearanceSync } from "@/features/appearance/use-appearance-sync";
import { usePeriodStore } from "@/features/earnings/period-store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useHapticsWarmup } from "@/features/haptics/haptics";
import { I18nProvider } from "@/features/i18n/i18n";
import { useLanguageStore } from "@/features/i18n/store";
import { Onboarding } from "@/features/onboarding/onboarding";
import { useOnboardingStore } from "@/features/onboarding/store";
import { MoneyWidgetSync } from "@/features/widgets/money-widget-sync";

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

export default function RootLayout() {
    useHapticsWarmup();
    const appearanceReady = useAppearanceSync();
    const { colors } = useEarningsTheme();
    const languageReady = useLanguageStore((state) => state.hydrated);
    const loadLanguage = useLanguageStore((state) => state.load);
    // Wait for the saved period so the Earnings screen never flashes "Today" first.
    const periodReady = usePeriodStore((state) => state.hydrated);
    const loadPeriod = usePeriodStore((state) => state.load);
    const onboarding = useOnboardingStore((state) => state.status);
    const appRevealed = useOnboardingStore((state) => state.revealed);
    const loadOnboarding = useOnboardingStore((state) => state.load);
    const [fontsLoaded] = useFonts({
        Archivo: Archivo_400Regular,
        "Archivo-Medium": Archivo_500Medium,
        "Archivo-SemiBold": Archivo_600SemiBold,
        "Archivo-Bold": Archivo_700Bold,
    });

    useEffect(() => { void loadLanguage(); }, [loadLanguage]);
    useEffect(() => { void loadPeriod(); }, [loadPeriod]);
    useEffect(() => { void loadOnboarding(); }, [loadOnboarding]);

    const ready = fontsLoaded && appearanceReady && languageReady && periodReady && onboarding !== "unknown";

    useEffect(() => {
        if (ready) SplashScreen.hideAsync();
    }, [ready]);

    if (!ready) return null;

    return (
        <I18nProvider>
            <MoneyWidgetSync />
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
                <SystemBars />
                <KeyboardProvider>
                    {appRevealed ? <AppTabs /> : null}
                </KeyboardProvider>
                {onboarding === "pending" ? <Onboarding /> : null}
            </GestureHandlerRootView>
        </I18nProvider>
    );
}
