import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flushLookBurst, shownLook, transitionLook } from "theme-transition";

import { SectionLabel, SettingsCard } from "@/components/settings-card";
import { LargeTitleScrollView } from "@/components/large-title-scroll-view";
import { TryAgainButton } from "@/components/try-again-button";
import { AccentColorPicker } from "@/features/appearance/accent-color-picker";
import { AppearanceSelector } from "@/features/appearance/appearance-selector";
import type { Appearance, PaletteId, ThemeMode } from "@/features/appearance/palettes";
import { useAppearanceStore } from "@/features/appearance/store";
import { useThemeHaptics } from "@/features/appearance/theme-haptics";
import { type ThemeTransitionOrigin, useReduceMotion } from "@/features/appearance/theme-transition";
import { CurrencyRow } from "@/features/currency/currency-selector";
import { MainCurrencySheet } from "@/features/currency/main-currency-sheet";
import { useDeveloperStore } from "@/features/developer/store";
import { DevJobControls } from "@/features/earnings/dev-job-controls";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { LanguageRow, useLanguageSetting } from "@/features/i18n/language-selector";
import { useWidgetsRowVisible, WidgetsSettingsRow } from "@/features/widgets/widgets-settings-row";

const LIST_ICON_INSET = 60;

function ErrorNote({ message }: { message: string }) {
    const { colors } = useEarningsTheme();
    return (
        <View className="mt-3 flex-row items-center gap-2 px-1">
            <SymbolView name="exclamationmark.circle.fill" size={14} tintColor={colors.danger} />
            <Text accessibilityLiveRegion="polite" className="flex-1 font-sans text-[12.5px] leading-5 text-muted">{message}</Text>
        </View>
    );
}

const PALETTE_REVEAL_MS = 1000;

const appearanceFrameKey = ({ palette, mode }: Pick<Appearance, "palette" | "mode">) => `settings:${palette}:${mode}`;

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { appearance, loading, loadError, update, load } = useAppearanceStore();
    const language = useLanguageSetting();
    const reduceMotion = useReduceMotion();
    const themeHaptics = useThemeHaptics();
    const [saveError, setSaveError] = useState(false);
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const widgetsVisible = useWidgetsRowVisible();
    const disabled = loading || loadError;

    useEffect(() => {
        void useDeveloperStore.getState().load();
    }, []);

    const tapTitle = () => {
        if (useDeveloperStore.getState().tap()) appHaptics.primaryAction();
    };

    const change = async (value: Partial<Appearance>) => {
        setSaveError(false);
        try {
            await update(value);
        } catch {
            setSaveError(true);
        }
    };

    const changeLook = (update: Pick<Appearance, "mode"> | Pick<Appearance, "palette">, origin: ThemeTransitionOrigin, durationMs?: number) => {
        const next = { ...shownLook(appearance), ...update };
        transitionLook({
            look: next,
            from: appearanceFrameKey(appearance),
            to: appearanceFrameKey(next),
            apply: () => { void change({ mode: next.mode, palette: next.palette }); },
            origin,
            reduceMotion,
            durationMs,
        });
    };

    const changeMode = (mode: ThemeMode, origin: ThemeTransitionOrigin) => {
        if (mode === shownLook(appearance).mode) return;
        themeHaptics.mode();
        changeLook({ mode }, origin);
    };

    const changePalette = (palette: PaletteId, origin: ThemeTransitionOrigin) => {
        if (palette === shownLook(appearance).palette) return;
        themeHaptics.palette();
        changeLook({ palette }, origin, PALETTE_REVEAL_MS);
    };

    useFocusEffect(useCallback(() => flushLookBurst, []));

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <LargeTitleScrollView
                    background={<EarningsBackground />}
                    title={t("settings.title")}
                    onTitlePress={tapTitle}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
                >
                    <SectionLabel>{t("settings.customization")}</SectionLabel>
                    <SettingsCard>
                        <AppearanceSelector appearance={appearance} disabled={disabled} onChange={changeMode} />
                        <AccentColorPicker appearance={appearance} disabled={disabled} onChange={changePalette} />
                        {widgetsVisible ? <WidgetsSettingsRow /> : null}
                    </SettingsCard>
                    {loadError || saveError ? <ErrorNote message={t(loadError ? "settings.loadError" : "settings.saveError")} /> : null}
                    {loadError ? <TryAgainButton onPress={() => void load()} className="mt-3" /> : null}

                    <SectionLabel>{t("settings.languageRegion")}</SectionLabel>
                    <SettingsCard dividerInset={LIST_ICON_INSET}>
                        <LanguageRow setting={language} />
                        <CurrencyRow onPress={() => setCurrencyOpen(true)} />
                    </SettingsCard>
                    {language.loadError || language.saveError ? (
                        <ErrorNote message={t(language.loadError ? "settings.loadError" : "settings.saveError")} />
                    ) : null}
                    {language.loadError ? <TryAgainButton onPress={() => void language.load()} className="mt-3" /> : null}

                    <DevJobControls />
                </LargeTitleScrollView>
            </View>
            {currencyOpen ? <MainCurrencySheet onDismiss={() => setCurrencyOpen(false)} /> : null}
        </View>
    );
}
