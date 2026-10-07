import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RaisedPressable } from "@/components/elevated/raised";
import { PALETTES } from "@/features/appearance/palettes";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";
import {
    BACKGROUNDS,
    EFFECTS,
    INTENSITIES,
    MOTIONS,
    type MoneyWidgetConfig,
    TEMPLATES,
    WIDGET_PERIODS,
    WIDGET_THEMES,
} from "@/features/widgets/widget-config";
import { BackChevron } from "@/features/widgets/widget-glyphs";
import { WidgetMenuRow } from "@/features/widgets/widget-menu-row";
import { ColorRow, SettingsCard, ToggleRow } from "@/features/widgets/widget-options";
import { type PreviewSize, WidgetPreviewPager, WidgetSizeSelector } from "@/features/widgets/widget-preview-pager";
import { useWidgetStore } from "@/features/widgets/widget-store";

const PERIOD_KEYS = {
    today: "period.today",
    week: "period.week",
    month: "period.month",
    year: "period.year",
} as const satisfies Record<string, TranslationKey>;

const THEME_KEYS = {
    system: "settings.mode.system",
    light: "settings.mode.light",
    dark: "settings.mode.dark",
} as const satisfies Record<string, TranslationKey>;

export default function WidgetsScreen() {
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const supported = useWidgetStore((state) => state.supported);
    const pinSupported = useWidgetStore((state) => state.pinSupported);
    const config = useWidgetStore((state) => state.config);
    const revision = useWidgetStore((state) => state.revision);
    const change = useWidgetStore((state) => state.change);
    const pin = useWidgetStore((state) => state.pin);
    const [previewSize, setPreviewSize] = useState<PreviewSize>("wide");
    const [pinFailed, setPinFailed] = useState(false);
    const contentWidth = Math.min(windowWidth, 430) - 44;
    const available = Platform.OS === "android" && supported !== false;

    useEffect(() => {
        void useWidgetStore.getState().load();
    }, []);

    useFocusEffect(useCallback(() => {
        void useWidgetStore.getState().refresh();
    }, []));

    const addWidget = async () => {
        appHaptics.primaryAction();
        try {
            setPinFailed(!(await pin()));
        } catch {
            setPinFailed(true);
        }
    };

    const options = <T extends string>(values: readonly T[], key: (value: T) => TranslationKey) =>
        values.map((value) => ({ value, label: t(key(value)) }));
    const set = <K extends keyof MoneyWidgetConfig>(key: K) => (value: MoneyWidgetConfig[K]) => change({ [key]: value });

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground />

                <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 22 }}>
                    <View className="flex-row items-center gap-3">
                        <RaisedPressable
                            testID="widgets-back"
                            accessibilityRole="button"
                            accessibilityLabel={t("widgets.back")}
                            onPress={() => router.back()}
                            hitSlop={8}
                            surface="row"
                            depth={3}
                            radius={20}
                            className="h-10 w-10 items-center justify-center"
                        >
                            <BackChevron color={colors.ink} />
                        </RaisedPressable>
                        <Text accessibilityRole="header" className="font-sans text-[30px] font-bold tracking-[-1px] text-ink">
                            {t("widgets.title")}
                        </Text>
                    </View>

                    {available ? (
                        <View className="mt-4">
                            <WidgetPreviewPager config={config} revision={revision} width={contentWidth} size={previewSize} onSizeChange={setPreviewSize} />
                        </View>
                    ) : null}
                </View>

                {available ? (
                    <ScrollView
                        testID="widgets-screen"
                        className="mt-1 flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 22 }}
                    >
                        <View className="mt-3 items-center">
                            <WidgetSizeSelector value={previewSize} onChange={setPreviewSize} />
                        </View>
                        <SettingsCard title={t("widgets.section.style")}>
                            <WidgetMenuRow
                                testID="widget-template"
                                label={t("widgets.section.layout")}
                                value={config.template}
                                options={options(TEMPLATES, (value) => `widgets.template.${value}` as TranslationKey)}
                                onChange={set("template")}
                            />
                            <WidgetMenuRow
                                testID="widget-effect"
                                label={t("widgets.section.effect")}
                                value={config.effect}
                                options={options(EFFECTS, (value) => `widgets.effect.${value}` as TranslationKey)}
                                onChange={set("effect")}
                            />
                            <WidgetMenuRow
                                testID="widget-motion"
                                label={t("widgets.section.motion")}
                                value={config.motion}
                                options={options(MOTIONS, (value) => `widgets.motion.${value}` as TranslationKey)}
                                onChange={set("motion")}
                            />
                            <WidgetMenuRow
                                testID="widget-intensity"
                                label={t("widgets.section.intensity")}
                                value={config.intensity}
                                options={options(INTENSITIES, (value) => `widgets.intensity.${value}` as TranslationKey)}
                                onChange={set("intensity")}
                            />
                        </SettingsCard>

                        <SettingsCard title={t("widgets.section.look")}>
                            <ColorRow
                                label={t("widgets.section.colors")}
                                appValue="app"
                                appLabel={t("widgets.sameAsApp")}
                                appColor={colors.accent}
                                swatches={PALETTES.map((palette) => ({
                                    value: palette.id,
                                    label: t(`palette.${palette.id}` as TranslationKey),
                                    color: palette.accent,
                                }))}
                                value={config.palette}
                                onChange={set("palette")}
                            />
                            <WidgetMenuRow
                                testID="widget-theme"
                                label={t("widgets.section.theme")}
                                value={config.theme}
                                options={options(WIDGET_THEMES, (value) => value === "app" ? "widgets.sameAsApp" : THEME_KEYS[value])}
                                onChange={set("theme")}
                            />
                            <WidgetMenuRow
                                testID="widget-background"
                                label={t("widgets.section.background")}
                                value={config.background}
                                options={options(BACKGROUNDS, (value) => `widgets.background.${value}` as TranslationKey)}
                                onChange={set("background")}
                            />
                        </SettingsCard>

                        <SettingsCard title={t("widgets.section.content")}>
                            <WidgetMenuRow
                                testID="widget-period"
                                label={t("widgets.section.period")}
                                value={config.period}
                                options={options(WIDGET_PERIODS, (value) => value === "app" ? "widgets.sameAsApp" : PERIOD_KEYS[value])}
                                onChange={set("period")}
                            />
                            <ToggleRow testID="widget-toggle-cents" label={t("widgets.cents")} value={config.cents} onChange={set("cents")} />
                            <ToggleRow testID="widget-toggle-caption" label={t("widgets.caption")} value={config.caption} onChange={set("caption")} />
                        </SettingsCard>

                        <View className="mt-7">
                            <RaisedPressable
                                testID="widgets-add"
                                accessibilityRole="button"
                                onPress={() => void addWidget()}
                                disabled={!pinSupported}
                                surface={pinSupported ? "accent" : "canvas"}
                                flat={!pinSupported}
                                depth={4}
                                radius={18}
                                className="min-h-[56px] items-center justify-center px-5"
                            >
                                <Text className={`font-sans text-[16px] font-bold ${pinSupported ? "text-ink" : "text-muted"}`}>
                                    {t("widgets.add")}
                                </Text>
                            </RaisedPressable>
                            {!pinSupported || pinFailed ? (
                                <Text accessibilityLiveRegion="polite" className="mt-3 px-1 text-center font-sans text-[13px] leading-5 text-muted">
                                    {t(pinSupported ? "widgets.pinError" : "widgets.pinUnsupported")}
                                </Text>
                            ) : null}
                        </View>
                    </ScrollView>
                ) : (
                    <View className="mx-[22px] mt-8 rounded-[20px] bg-row p-5">
                        <Text className="font-sans text-[15px] font-semibold leading-[22px] text-ink">{t("widgets.unsupported")}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}
