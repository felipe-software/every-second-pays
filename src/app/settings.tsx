import { SymbolView } from "expo-symbols";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccentColorPicker } from "@/features/appearance/accent-color-picker";
import { AppearanceSelector } from "@/features/appearance/appearance-selector";
import type { Appearance } from "@/features/appearance/palettes";
import { useAppearanceStore } from "@/features/appearance/store";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";
import { LanguageSelector } from "@/features/i18n/language-selector";

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const { appearance, saving, loading, loadError, update, load } = useAppearanceStore();
    const [saveError, setSaveError] = useState(false);
    const disabled = saving || loading || loadError;

    const change = async (value: Partial<Appearance>) => {
        setSaveError(false);
        try {
            await update(value);
        } catch {
            setSaveError(true);
        }
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground />
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: insets.top + 34, paddingBottom: insets.bottom + 112, paddingHorizontal: 22 }}
                >
                    <Text accessibilityRole="header" className="font-sans text-[38px] font-bold tracking-[-1.4px] text-ink">
                        {t("settings.title")}
                    </Text>

                    <Text className="mt-9 mb-3 ml-1 font-sans text-[13px] font-semibold text-muted">{t("settings.appearance")}</Text>
                    <AppearanceSelector
                        appearance={appearance}
                        disabled={disabled}
                        onChange={(mode) => void change({ mode })}
                    />

                    <Text className="mt-8 mb-3 ml-1 font-sans text-[13px] font-semibold text-muted">{t("settings.accentColor")}</Text>
                    <AccentColorPicker
                        appearance={appearance}
                        disabled={disabled}
                        onChange={(palette) => void change({ palette })}
                    />

                    <LanguageSelector />

                    {loadError || saveError ? (
                        <View className="mt-5 flex-row items-center gap-2 px-1">
                            <SymbolView name="exclamationmark.circle.fill" size={14} tintColor={colors.danger} />
                            <Text accessibilityLiveRegion="polite" className="font-sans text-[12.5px] leading-5 text-muted">
                                {t(loadError ? "settings.loadError" : "settings.saveError")}
                            </Text>
                        </View>
                    ) : null}
                    {loadError ? (
                        <Pressable accessibilityRole="button" onPress={() => void load()} className="mt-2 min-h-11 justify-center px-1 active:opacity-65">
                            <Text className="font-sans font-semibold text-accent-deep">{t("common.tryAgain")}</Text>
                        </Pressable>
                    ) : null}
                </ScrollView>
            </View>
        </View>
    );
}
