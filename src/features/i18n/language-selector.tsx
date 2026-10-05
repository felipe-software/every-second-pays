import { useState } from "react";
import { Text, View } from "react-native";

import { Raised, usePressSink } from "@/components/elevated/raised";
import { TryAgainButton } from "@/components/try-again-button";
import type { ThemeTransitionOrigin } from "@/features/appearance/theme-transition";
import { appHaptics } from "@/features/haptics/haptics";

import { useI18n } from "./i18n";
import { LanguageMenu } from "./language-menu";
import { type LanguagePreference, useLanguageStore } from "./store";

export function LanguageSelector({ reduceMotion }: { reduceMotion: boolean }) {
    const { t } = useI18n();
    const sink = usePressSink();
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
            <Raised surface="row" depth={3} radius={18} pressed={sink.pressed} className="overflow-hidden">
                <LanguageMenu
                    preference={preference}
                    disabled={disabled}
                    onOpen={appHaptics.selection}
                    onPressIn={sink.onPressIn}
                    onPressOut={sink.onPressOut}
                    onChange={change}
                />
            </Raised>
            {loadError || saveError ? (
                <Text accessibilityLiveRegion="polite" className="mt-3 px-1 font-sans text-[12.5px] leading-5 text-muted">
                    {t(loadError ? "settings.loadError" : "settings.saveError")}
                </Text>
            ) : null}
            {loadError ? (
                <TryAgainButton onPress={() => void load()} className="mt-3" />
            ) : null}
        </View>
    );
}
