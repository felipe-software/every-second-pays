import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MoneyWidgetPreview } from "react-native-noti";
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import type { MoneyWidgetConfig } from "./widget-config";
import { CompactSegments } from "./widget-options";

export type PreviewSize = "small" | "wide" | "large";
const PREVIEW_SIZES: readonly PreviewSize[] = ["small", "wide", "large"];
const PREVIEW_HEIGHT: Record<PreviewSize, number> = { small: 150, wide: 150, large: 236 };
const STAGE_PADDING = 16;
const STAGE_HEIGHTS = PREVIEW_SIZES.map((size) => PREVIEW_HEIGHT[size] + STAGE_PADDING * 2);

export function WidgetPreviewPager({
    config,
    revision,
    width,
    size,
    onSizeChange,
}: {
    config: MoneyWidgetConfig;
    revision: number;
    width: number;
    size: PreviewSize;
    onSizeChange: (size: PreviewSize) => void;
}) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const page = PREVIEW_SIZES.indexOf(size);
    const pager = useAnimatedRef<Animated.ScrollView>();
    const offset = useSharedValue(page * width);
    // Only a swipe reports the page it passes; a tap on the selector already chose one.
    const dragging = useSharedValue(false);
    const shown = useSharedValue(page);
    const pageOffsets = PREVIEW_SIZES.map((_, index) => index * width);
    // Claims the swipe natively so the enclosing tab pager doesn't switch tabs.
    const native = useMemo(() => Gesture.Native().disallowInterruption(true), []);

    const swiped = (next: number) => {
        appHaptics.selection();
        onSizeChange(PREVIEW_SIZES[next]);
    };

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            offset.set(event.contentOffset.x);
            if (!dragging.get() || width <= 0) return;
            const next = Math.min(Math.max(Math.round(event.contentOffset.x / width), 0), PREVIEW_SIZES.length - 1);
            if (next === shown.get()) return;
            shown.set(next);
            scheduleOnRN(swiped, next);
        },
        onBeginDrag: () => dragging.set(true),
        onMomentumEnd: () => dragging.set(false),
    });

    const stageStyle = useAnimatedStyle(() => ({
        height: interpolate(offset.get(), pageOffsets, STAGE_HEIGHTS, Extrapolation.CLAMP),
    }));

    useEffect(() => {
        if (page === shown.get()) return;
        dragging.set(false);
        shown.set(page);
        pager.current?.scrollTo({ x: page * width, animated: true });
    }, [dragging, page, pager, shown, width]);

    useEffect(() => {
        pager.current?.scrollTo({ x: shown.get() * width, animated: false });
    }, [pager, shown, width]);

    return (
        <Animated.View className="overflow-hidden rounded-[26px]" style={[{ backgroundColor: colors.row }, stageStyle]}>
            <View className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-accent" style={{ opacity: 0.16 }} />
            <View className="absolute -right-10 -bottom-24 h-60 w-60 rounded-full" style={{ backgroundColor: colors.accentDeep, opacity: 0.12 }} />
            <GestureDetector gesture={native}>
                <Animated.ScrollView
                    ref={pager}
                    testID="widget-preview-pager"
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentOffset={{ x: page * width, y: 0 }}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    style={StyleSheet.absoluteFill}
                >
                    {PREVIEW_SIZES.map((item) => (
                        <View
                            key={item}
                            className="items-center"
                            importantForAccessibility={item === size ? "auto" : "no-hide-descendants"}
                            style={{ width, paddingTop: STAGE_PADDING }}
                        >
                            <MoneyWidgetPreview
                                testID={`widget-preview-${item}`}
                                accessibilityLabel={t("widgets.previewAccessibility")}
                                config={config}
                                revision={revision}
                                style={{ width: item === "small" ? 160 : width - 32, height: PREVIEW_HEIGHT[item] }}
                            />
                        </View>
                    ))}
                </Animated.ScrollView>
            </GestureDetector>
        </Animated.View>
    );
}

export function WidgetSizeSelector({ value, onChange }: { value: PreviewSize; onChange: (size: PreviewSize) => void }) {
    const { t } = useI18n();
    return (
        <CompactSegments
            testID="widget-preview-size"
            options={PREVIEW_SIZES.map((size) => ({ value: size, label: t(`widgets.size.${size}` as TranslationKey) }))}
            value={value}
            onChange={onChange}
        />
    );
}
