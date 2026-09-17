import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { ThemeTransitionOrigin } from "@/features/appearance/theme-transition";
import { appHaptics } from "@/features/haptics/haptics";

import { useI18n } from "./i18n";
import { LanguageMenu } from "./language-menu";
import { type LanguagePreference, useLanguageStore } from "./store";

export function LanguageSelector({ reduceMotion }: { reduceMotion: boolean }) {
    const { t } = useI18n();
    const { preference, hydrated, saving, loading, loadError, update, load } = useLanguageStore();
    const [saveError, setSaveError] = useState(false);
    const disabled = !hydrated || loading || loadError;

    const persist = async (value: LanguagePreference) => {
        setSaveError(false);
        try {
            await update(value);
        } catch {
            setSaveError(true);
        }
    };

    const change = (value: LanguagePreference, origin?: ThemeTransitionOrigin) => {
        if (value === preference || saving) return;
        appHaptics.selection();
        void persist(value);
    };

    return (
        <View testID="language-selector" className="mt-8">
            <View className="overflow-hidden rounded-[18px] bg-row">
                <LanguageMenu
                    preference={preference}
                    disabled={disabled}
                    onOpen={appHaptics.selection}
                    onChange={change}
                />
            </View>
            {loadError || saveError ? (
                <Text accessibilityLiveRegion="polite" className="mt-3 px-1 font-sans text-[12.5px] leading-5 text-muted">
                    {t(loadError ? "settings.loadError" : "settings.saveError")}
                </Text>
            ) : null}
            {loadError ? (
                <Pressable accessibilityRole="button" onPress={() => void load()} className="min-h-11 justify-center px-1 active:opacity-65">
                    <Text className="font-sans font-semibold text-accent-deep">{t("common.tryAgain")}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
