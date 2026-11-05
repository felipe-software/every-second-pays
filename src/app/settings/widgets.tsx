import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RaisedPressable } from "@/components/elevated/raised";
import { LargeTitleScrollView } from "@/components/large-title-scroll-view";
import { SectionLabel } from "@/components/settings-card";
import { currencyPrefix } from "@/features/currency/currencies";
import { useCurrencyStore } from "@/features/currency/store";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { WidgetAddSection } from "@/features/widgets/widget-add-section";
import { WidgetAppearanceGroup } from "@/features/widgets/widget-appearance-group";
import type { MoneyWidgetConfig } from "@/features/widgets/widget-config";
import { WidgetContentGroup } from "@/features/widgets/widget-content-group";
import { BackChevron } from "@/features/widgets/widget-glyphs";
import { WidgetLayoutCard } from "@/features/widgets/widget-layout-card";
import { WidgetMotionGroup } from "@/features/widgets/widget-motion-group";
import { type PreviewSize, WidgetPreviewPager } from "@/features/widgets/widget-preview-pager";
import { useWidgetStore } from "@/features/widgets/widget-store";

export default function WidgetsScreen() {
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const { colors } = useEarningsTheme();
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

    useEffect(() => {
        void useWidgetStore.getState().load();
    }, []);

    useFocusEffect(
        useCallback(() => {
            void useWidgetStore.getState().refresh();
        }, []),
    );

    const addWidget = async () => {
        appHaptics.primaryAction();
        try {
            setPinFailed(!(await pin()));
        } catch {
            setPinFailed(true);
        }
    };

    const set =
        <K extends keyof MoneyWidgetConfig>(key: K) =>
        (value: MoneyWidgetConfig[K]) =>
            change({ [key]: value });

    const symbol = currencyPrefix(mainCurrency).trim();
    const sampleCaption = t("widgets.rateCaption", { amount: `${currencyPrefix(mainCurrency)}${formatMoney(124.92)}` });
    const sampleAmount = formatMoney(1284, 0);

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden">
                <LargeTitleScrollView
                    background={<EarningsBackground />}
                    testID="widgets-screen"
                    title={t("widgets.title")}
                    headerLeft={<BackButton label={t("widgets.back")} color={colors.ink} />}
                    stickyHeader={
                        available ? (
                            <View className="mt-0.5">
                                <WidgetPreviewPager
                                    config={config}
                                    revision={revision}
                                    width={Math.min(windowWidth, 430)}
                                    size={previewSize}
                                    onSizeChange={setPreviewSize}
                                />
                            </View>
                        ) : undefined
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    {available ? (
                        <>
                            <SectionLabel>{t("widgets.section.layout")}</SectionLabel>
                            <WidgetLayoutCard
                                config={config}
                                set={set}
                                previewSize={previewSize}
                                onPreviewSizeChange={setPreviewSize}
                                sampleSymbol={symbol}
                                sampleAmount={sampleAmount}
                                sampleCaption={sampleCaption}
                            />

                            <View className="h-4" />
                            <WidgetAppearanceGroup config={config} set={set} />
                            <WidgetMotionGroup config={config} set={set} />
                            <WidgetContentGroup config={config} set={set} />

                            <WidgetAddSection pinSupported={pinSupported} pinFailed={pinFailed} onAdd={addWidget} />
                        </>
                    ) : (
                        <View className="mt-6 rounded-[20px] bg-row p-5">
                            <Text className="font-sans text-[15px] font-semibold leading-[22px] text-ink">
                                {t("widgets.unsupported")}
                            </Text>
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
