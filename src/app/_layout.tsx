import "../global.css";

import {
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    useFonts,
} from "@expo-google-fonts/archivo";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import AppTabs from "@/components/app-tabs";
import { useAppearanceSync } from "@/features/appearance/use-appearance-sync";
import { useHapticsWarmup } from "@/features/haptics/haptics";
import { I18nProvider } from "@/features/i18n/i18n";
import { useLanguageStore } from "@/features/i18n/store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    useHapticsWarmup();
    const appearanceReady = useAppearanceSync();
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
            <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                    <AppTabs />
                </KeyboardProvider>
            </GestureHandlerRootView>
        </I18nProvider>
    );
}
