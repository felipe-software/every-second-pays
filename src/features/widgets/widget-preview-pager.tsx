import { type NativeStackNavigationProp, useNavigation } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { PAGE_GUTTER } from "@/components/large-title-scroll-view";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { MoneyWidgetConfig } from "./widget-config";

export type PreviewSize = "small" | "wide" | "large";
export const PREVIEW_SIZES: readonly PreviewSize[] = ["small", "wide", "large"];
const PREVIEW_HEIGHT: Record<PreviewSize, number> = { small: 168, wide: 150, large: 236 };
const STAGE_PADDING = 16;
const STAGE_HEIGHTS = PREVIEW_SIZES.map((size) => PREVIEW_HEIGHT[size] + STAGE_PADDING * 2);

function useTransitionFinished() {
    const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
    const [finished, setFinished] = useState(false);

    useEffect(() => navigation.addListener("transitionEnd", (event) => {
        if (!event.data.closing) setFinished(true);
    }), [navigation]);

    return finished;
}

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
    const { t } = useI18n();
    const transitionFinished = useTransitionFinished();
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
        <Animated.View className="overflow-hidden" style={[{ marginHorizontal: -PAGE_GUTTER }, stageStyle]}>
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
                            {transitionFinished ? (
                                <MoneyWidgetPreview
                                    testID={`widget-preview-${item}`}
                                    accessibilityLabel={t("widgets.previewAccessibility")}
                                    config={config}
                                    revision={revision}
                                    active={item === size}
                                    style={{ width: item === "small" ? 168 : width - PAGE_GUTTER * 2, height: PREVIEW_HEIGHT[item] }}
                                />
                            ) : null}
                        </View>
                    ))}
                </Animated.ScrollView>
            </GestureDetector>
        </Animated.View>
    );
}
