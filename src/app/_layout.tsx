import "../global.css";

import {
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    useFonts,
} from "@expo-google-fonts/archivo";
import { ReanimatedTrueSheetProvider } from "@lodev09/react-native-true-sheet/reanimated";
import { NavigationBar } from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AppTabs from "@/components/app-tabs";
import {
    SHEET_RECEDE_BACKDROP,
    SHEET_RECEDE_ENABLED,
    SheetRecede,
    useSheetReceded,
} from "@/components/sheet-recede";
import { useAppearanceSync } from "@/features/appearance/use-appearance-sync";
import { usePeriodStore } from "@/features/earnings/period-store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useHapticsWarmup } from "@/features/haptics/haptics";
import { I18nProvider } from "@/features/i18n/i18n";
import { useLanguageStore } from "@/features/i18n/store";
import { MoneyWidgetSync } from "@/features/widgets/money-widget-sync";

SplashScreen.preventAutoHideAsync();

function SystemBars() {
    const { isDark } = useEarningsTheme();
    const receded = useSheetReceded();

    return (
        <>
            <StatusBar style={isDark || receded ? "light" : "dark"} />
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
    const [fontsLoaded] = useFonts({
        Archivo: Archivo_400Regular,
        "Archivo-Medium": Archivo_500Medium,
        "Archivo-SemiBold": Archivo_600SemiBold,
        "Archivo-Bold": Archivo_700Bold,
    });

    useEffect(() => { void loadLanguage(); }, [loadLanguage]);
    useEffect(() => { void loadPeriod(); }, [loadPeriod]);

    useEffect(() => {
        if (fontsLoaded && appearanceReady && languageReady && periodReady) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, appearanceReady, languageReady, periodReady]);

    if (!fontsLoaded || !appearanceReady || !languageReady || !periodReady) return null;

    return (
        <I18nProvider>
            <MoneyWidgetSync />
            <GestureHandlerRootView
                style={{ flex: 1, backgroundColor: SHEET_RECEDE_ENABLED ? SHEET_RECEDE_BACKDROP : colors.canvas }}
            >
                <ReanimatedTrueSheetProvider>
                    <SystemBars />
                    <KeyboardProvider>
                        <SheetRecede backgroundColor={colors.canvas}>
                            <AppTabs />
                        </SheetRecede>
                    </KeyboardProvider>
                </ReanimatedTrueSheetProvider>
            </GestureHandlerRootView>
        </I18nProvider>
    );
}
