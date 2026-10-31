import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { Raised, RaisedPressable } from "@/components/elevated/raised";
import { LargeTitleScrollView } from "@/components/large-title-scroll-view";
import { LineIcon } from "@/components/line-icon";
import { SectionLabel } from "@/components/settings-card";
import { PALETTES } from "@/features/appearance/palettes";
import { currencyPrefix } from "@/features/currency/currencies";
import { useCurrencyStore } from "@/features/currency/store";
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
import {
    ChipIcon,
    CollapsibleCard,
    OptionChips,
    OptionGroup,
    PickerTiles,
    SizeSegments,
    SwatchRow,
    SwitchRow,
} from "@/features/widgets/widget-options";
import { type PreviewSize, PREVIEW_SIZES, WidgetPreviewPager } from "@/features/widgets/widget-preview-pager";
import { useWidgetStore } from "@/features/widgets/widget-store";

const GROUP_ICONS = {
    appearance: "M12 3.5c3.6 4.3 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 2.4-6.2 6-10.5Z",
    motion: "M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0",
    content: "M5 7h14M5 12h14M5 17h9",
};

const SIZE_GLYPHS: Record<PreviewSize, { width: number; height: number }> = {
    small: { width: 14, height: 14 },
    wide: { width: 22, height: 14 },
    large: { width: 22, height: 18 },
};

const OPTION_ICONS: Record<string, string> = {
    rain: "M7 4 5 9M13 5l-2 5M19 4l-2 5M9 14l-2 5M16 14l-2 5",
    stream: "M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0",
    fountain: "M12 21V10M12 10c-1.5-4-5.5-5.5-8.5-3.5M12 10c1.5-4 5.5-5.5 8.5-3.5",
    roll: "M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4",
    drop: "M12 4v11M7 10l5 5 5-5M5 20h14",
    flip: "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM5 12h14",
    blur: "M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6ZM4 12a8 8 0 0 1 2.3-5.6M12 4a8 8 0 0 1 5.6 2.3M20 12a8 8 0 0 1-2.3 5.6M12 20a8 8 0 0 1-5.6-2.3",
    slot: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM9 6v12M15 6v12",
    calm: "M3 12c3-2.5 6-2.5 9 0s6 2.5 9 0",
    lively: "M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0",
    wild: "M13 3 6 13h5l-1 8 7-10h-5l1-8Z",
    app: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM10.5 18h3",
    system: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17ZM12 3.5v17M12 8h5.5M12 12h8.5M12 16h5.5",
    light: "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
    dark: "M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z",
    today: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M11.5 15h1",
    week: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M7.5 15h9",
    month: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01",
    year: "M9 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM7 12h14M11 5v4M17 5v4M4 9.5V17",
};

function optionIcon(value: string, selected: boolean) {
    if (value === "orbit") {
        return (
            <ChipIcon selected={selected}>
                <Ellipse cx={12} cy={12} rx={9.5} ry={5.5} />
                <Circle cx={12} cy={12} r={2} fill="currentColor" stroke="none" />
            </ChipIcon>
        );
    }
    if (value === "none") {
        return (
            <ChipIcon selected={selected} d="m6.5 17.5 11-11">
                <Circle cx={12} cy={12} r={8} />
            </ChipIcon>
        );
    }
    return <ChipIcon selected={selected} d={OPTION_ICONS[value]} />;
}

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

function TemplateArt({ template, symbol, amount, caption, period }: { template: MoneyWidgetConfig["template"]; symbol: string; amount: string; caption: string; period: string }) {
    const { colors } = useEarningsTheme();
    const minimal = template === "minimal";
    const ledger = template === "ledger";
    const size = minimal ? 17 : ledger ? 13 : 15;

    return (
        <View
            className={`flex-1 ${minimal ? "items-center justify-center" : `${ledger ? "items-start px-2" : "items-center px-1.5"} justify-between pt-[5px] pb-1`}`}
        >
            {minimal ? null : (
                <View className="flex-row items-center gap-[3px]">
                    <View className="h-1 w-1 rounded-full bg-accent" />
                    <Text className="font-sans text-[6.5px] font-bold tracking-[0.4px]" style={{ color: colors.accentDeep }}>{period}</Text>
                </View>
            )}
            <Text numberOfLines={1} className="font-sans font-bold text-ink" style={{ fontSize: size, letterSpacing: minimal ? -0.6 : -0.5 }}>
                <Text className="font-sans font-medium text-muted" style={{ fontSize: Math.round(size * 0.47) }}>{symbol}</Text>
                {amount}
            </Text>
            {minimal ? null : (
                <Text numberOfLines={1} className="font-sans text-[6.5px] font-medium text-muted">{caption}</Text>
            )}
        </View>
    );
}

function BackgroundArt({ background }: { background: MoneyWidgetConfig["background"] }) {
    const { colors } = useEarningsTheme();
    if (background === "solid") return null;
    if (background === "glow") {
        return (
            <Svg width="100%" height="100%" style={{ position: "absolute" }}>
                <Defs>
                    <RadialGradient id="glow-accent" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={colors.accent} stopOpacity={0.5} />
                        <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
                    </RadialGradient>
                    <RadialGradient id="glow-deep" cx="50%" cy="50%" r="50%">
                        <Stop offset="0" stopColor={colors.accentDeep} stopOpacity={0.32} />
                        <Stop offset="1" stopColor={colors.accentDeep} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Ellipse cx="20%" cy="25%" rx="40%" ry="85%" fill="url(#glow-accent)" />
                <Ellipse cx="85%" cy="105%" rx="35%" ry="75%" fill="url(#glow-deep)" />
            </Svg>
        );
    }
    return (
        <>
            <Svg width="100%" height="100%" style={{ position: "absolute" }}>
                <Defs>
                    <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={colors.accent} />
                        <Stop offset="1" stopColor={colors.accentDeep} />
                    </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#glass)" />
                <Circle cx={21} cy={20} r={11} fill={colors.canvas} fillOpacity={0.55} />
            </Svg>
            <View className="absolute inset-x-[9px] inset-y-[7px] rounded-[9px]" style={{ backgroundColor: `${colors.canvas}BD` }} />
        </>
    );
}

export default function WidgetsScreen() {
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const { colors, isDark } = useEarningsTheme();
    const { t, formatMoney } = useI18n();
    const supported = useWidgetStore((state) => state.supported);
    const pinSupported = useWidgetStore((state) => state.pinSupported);
    const config = useWidgetStore((state) => state.config);
    const revision = useWidgetStore((state) => state.revision);
    const change = useWidgetStore((state) => state.change);
    const pin = useWidgetStore((state) => state.pin);
    const mainCurrency = useCurrencyStore((state) => state.main);
    const [previewSize, setPreviewSize] = useState<PreviewSize>("wide");
    const [pinFailed, setPinFailed] = useState(false);
    const available = Platform.OS === "android" && supported !== false;
    const ctaText = isDark ? colors.canvas : "#FFFFFF";

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

    const set = <K extends keyof MoneyWidgetConfig>(key: K) => (value: MoneyWidgetConfig[K]) => change({ [key]: value });
    const chips = <T extends string>(values: readonly T[], selected: T, label: (value: T) => string) =>
        values.map((value) => ({ value, label: label(value), icon: optionIcon(value, value === selected) }));

    const symbol = currencyPrefix(mainCurrency).trim();
    const sampleCaption = t("widgets.rateCaption", { amount: `${currencyPrefix(mainCurrency)}${formatMoney(124.92)}` });
    const sampleAmount = formatMoney(1284, 0);

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <LargeTitleScrollView
                    background={<EarningsBackground />}
                    testID="widgets-screen"
                    title={t("widgets.title")}
                    headerLeft={<BackButton label={t("widgets.back")} color={colors.ink} />}
                    stickyHeader={available ? (
                        <View className="mt-0.5">
                            <WidgetPreviewPager
                                config={config}
                                revision={revision}
                                width={Math.min(windowWidth, 430)}
                                size={previewSize}
                                onSizeChange={setPreviewSize}
                            />
                        </View>
                    ) : undefined}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    {available ? (
                        <>
                            <SectionLabel>{t("widgets.section.layout")}</SectionLabel>
                            <Raised surface="card" depth={3} radius={20} className="gap-3.5 p-3">
                                <SizeSegments
                                    label={t("widgets.section.size")}
                                    options={PREVIEW_SIZES.map((size) => ({
                                        value: size,
                                        label: t(`widgets.size.${size}` as TranslationKey),
                                        glyph: SIZE_GLYPHS[size],
                                    }))}
                                    value={previewSize}
                                    onChange={setPreviewSize}
                                />
                                <PickerTiles
                                    testID="widget-template"
                                    label={t("widgets.section.layout")}
                                    height={66}
                                    options={TEMPLATES.map((template) => ({
                                        value: template,
                                        label: t(`widgets.template.${template}` as TranslationKey),
                                        art: (
                                            <TemplateArt
                                                template={template}
                                                symbol={symbol}
                                                amount={sampleAmount}
                                                caption={sampleCaption}
                                                period={t("settings.previewToday")}
                                            />
                                        ),
                                    }))}
                                    value={config.template}
                                    onChange={set("template")}
                                />
                            </Raised>

                            <View className="h-4" />
                            <CollapsibleCard testID="widget-group-appearance" icon={GROUP_ICONS.appearance} title={t("widgets.group.appearance")}>
                                <OptionGroup label={t("widgets.section.colors")}>
                                    <SwatchRow
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
                                </OptionGroup>
                                <OptionGroup label={t("widgets.section.theme")}>
                                    <OptionChips
                                        testID="widget-theme"
                                        label={t("widgets.section.theme")}
                                        options={chips(WIDGET_THEMES, config.theme, (value) => t(value === "app" ? "widgets.sameAsApp" : THEME_KEYS[value]))}
                                        value={config.theme}
                                        onChange={set("theme")}
                                    />
                                </OptionGroup>
                                <OptionGroup label={t("widgets.section.background")}>
                                    <PickerTiles
                                        testID="widget-background"
                                        label={t("widgets.section.background")}
                                        height={50}
                                        options={BACKGROUNDS.map((background) => ({
                                            value: background,
                                            label: t(`widgets.background.${background}` as TranslationKey),
                                            art: <BackgroundArt background={background} />,
                                        }))}
                                        value={config.background}
                                        onChange={set("background")}
                                    />
                                </OptionGroup>
                            </CollapsibleCard>

                            <CollapsibleCard testID="widget-group-motion" icon={GROUP_ICONS.motion} title={t("widgets.group.motion")}>
                                <OptionGroup label={t("widgets.section.effect")}>
                                    <OptionChips
                                        testID="widget-effect"
                                        label={t("widgets.section.effect")}
                                        options={chips(EFFECTS, config.effect, (value) => t(`widgets.effect.${value}` as TranslationKey))}
                                        value={config.effect}
                                        onChange={set("effect")}
                                    />
                                </OptionGroup>
                                <OptionGroup label={t("widgets.section.motion")}>
                                    <OptionChips
                                        testID="widget-motion"
                                        label={t("widgets.section.motion")}
                                        options={chips(MOTIONS, config.motion, (value) => t(`widgets.motion.${value}` as TranslationKey))}
                                        value={config.motion}
                                        onChange={set("motion")}
                                    />
                                </OptionGroup>
                                <OptionGroup label={t("widgets.section.intensity")}>
                                    <OptionChips
                                        testID="widget-intensity"
                                        label={t("widgets.section.intensity")}
                                        options={chips(INTENSITIES, config.intensity, (value) => t(`widgets.intensity.${value}` as TranslationKey))}
                                        value={config.intensity}
                                        onChange={set("intensity")}
                                    />
                                </OptionGroup>
                            </CollapsibleCard>

                            <CollapsibleCard testID="widget-group-content" icon={GROUP_ICONS.content} title={t("widgets.section.content")}>
                                <OptionGroup label={t("widgets.section.period")}>
                                    <OptionChips
                                        testID="widget-period"
                                        label={t("widgets.section.period")}
                                        options={chips(WIDGET_PERIODS, config.period, (value) => t(value === "app" ? "widgets.sameAsApp" : PERIOD_KEYS[value]))}
                                        value={config.period}
                                        onChange={set("period")}
                                    />
                                </OptionGroup>
                                <SwitchRow testID="widget-toggle-cents" label={t("widgets.cents")} value={config.cents} onChange={set("cents")} />
                                <SwitchRow
                                    testID="widget-toggle-caption"
                                    label={t("widgets.caption")}
                                    value={config.caption}
                                    disabled={config.template === "minimal"}
                                    onChange={set("caption")}
                                />
                            </CollapsibleCard>

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
                                    className="min-h-[56px] flex-row items-center justify-center gap-2 px-5"
                                >
                                    {pinSupported ? <LineIcon d="M12 5v14M5 12h14" color={ctaText} size={18} strokeWidth={2.2} /> : null}
                                    <Text className="font-sans text-[16px] font-bold" style={{ color: pinSupported ? ctaText : colors.muted }}>
                                        {t("widgets.add")}
                                    </Text>
                                </RaisedPressable>
                                {!pinSupported || pinFailed ? (
                                    <Text accessibilityLiveRegion="polite" className="mt-3 px-1 text-center font-sans text-[13px] leading-5 text-muted">
                                        {t(pinSupported ? "widgets.pinError" : "widgets.pinUnsupported")}
                                    </Text>
                                ) : null}
                            </View>
                        </>
                    ) : (
                        <View className="mt-6 rounded-[20px] bg-row p-5">
                            <Text className="font-sans text-[15px] font-semibold leading-[22px] text-ink">{t("widgets.unsupported")}</Text>
                        </View>
                    )}
                </LargeTitleScrollView>
            </View>
        </View>
    );
}

function BackButton({ label, color }: { label: string; color: string }) {
    return (
        <RaisedPressable
            testID="widgets-back"
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.back()}
            hitSlop={8}
            surface="card"
            depth={3}
            radius={20}
            className="h-10 w-10 items-center justify-center"
        >
            <BackChevron color={color} />
        </RaisedPressable>
    );
}

