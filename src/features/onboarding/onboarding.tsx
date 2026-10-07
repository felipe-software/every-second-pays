import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    interpolateColor,
    ReduceMotion,
    type SharedValue,
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { PrimaryButton } from "@/features/earnings/payment-sheet-controls";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { MoneyWaveStep } from "./money-wave-step";
import { OnboardingBackground } from "./onboarding-background";
import { OpenSourceStep } from "./open-source-step";
import { PrivateStep } from "./private-step";
import { useOnboardingStore } from "./store";
import { WidgetStep } from "./widget-step";

const STEP_COUNT = 4;
const LAST_STEP = STEP_COUNT - 1;
const FADE = { duration: 320, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

function Dot({ index, scroll, width }: { index: number; scroll: SharedValue<number>; width: number }) {
    const { colors } = useEarningsTheme();
    const style = useAnimatedStyle(() => {
        const position = width > 0 ? scroll.get() / width : 0;
        const focus = interpolate(position, [index - 1, index, index + 1], [0, 1, 0], Extrapolation.CLAMP);
        return {
            width: 8 + focus * 16,
            backgroundColor: interpolateColor(focus, [0, 1], [colors.track, colors.accent]),
        };
    });
    return <Animated.View style={[styles.dot, style]} />;
}

/**
 * The first-launch walkthrough, drawn over the app: money in motion, the home-screen widget,
 * privacy, and the open-source code. Swiping and the buttons unlock once the opening animation
 * has played through.
 */
export function Onboarding() {
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const finish = useOnboardingStore((state) => state.finish);
    const pager = useAnimatedRef<Animated.ScrollView>();
    const scroll = useSharedValue(0);
    const pulse = useSharedValue(0);
    const opacity = useSharedValue(1);
    const controls = useSharedValue(0);
    const [page, setPage] = useState(0);
    const [visits, setVisits] = useState(() => [1, 0, 0, 0]);
    const [introDone, setIntroDone] = useState(false);
    const leaving = useRef(false);
    const shownPage = useSharedValue(0);

    const ready = introDone || page > 0;

    const enterPage = useCallback((next: number) => {
        setPage(next);
        setVisits((current) => current.map((count, index) => index === next ? count + 1 : count));
        appHaptics.selection();
    }, []);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scroll.set(event.contentOffset.x);
            if (width <= 0) return;
            // A page counts as entered once it's more than half in view, so it animates in mid-swipe.
            const next = Math.min(Math.max(Math.round(event.contentOffset.x / width), 0), LAST_STEP);
            if (next === shownPage.get()) return;
            shownPage.set(next);
            scheduleOnRN(enterPage, next);
        },
    });

    const goTo = useCallback((next: number) => {
        pager.current?.scrollTo({ x: next * width, animated: true });
    }, [pager, width]);

    const leave = useCallback(() => {
        if (leaving.current) return;
        leaving.current = true;
        opacity.set(withTiming(0, FADE, (finished) => {
            if (finished) scheduleOnRN(finish);
        }));
    }, [finish, opacity]);

    const onIntroDone = useCallback(() => setIntroDone(true), []);

    useEffect(() => {
        controls.set(withTiming(ready ? 1 : 0, FADE));
    }, [controls, ready]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            if (page === 0) return false;
            goTo(page - 1);
            return true;
        });
        return () => subscription.remove();
    }, [goTo, page]);

    const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
    const controlsStyle = useAnimatedStyle(() => ({
        opacity: controls.get(),
        transform: [{ translateY: (1 - controls.get()) * 24 }],
    }));

    return (
        <Animated.View testID="onboarding" style={[StyleSheet.absoluteFill, styles.root, rootStyle]}>
            <OnboardingBackground scroll={scroll} pulse={pulse} />

            <Animated.ScrollView
                ref={pager}
                horizontal
                pagingEnabled
                scrollEnabled={ready}
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={StyleSheet.absoluteFill}
            >
                <View importantForAccessibility={page === 0 ? "auto" : "no-hide-descendants"}>
                    <MoneyWaveStep active={page === 0} width={width} height={height} pulse={pulse} onIntroDone={onIntroDone} />
                </View>
                <View importantForAccessibility={page === 1 ? "auto" : "no-hide-descendants"}>
                    {visits[1] > 0 ? <WidgetStep visit={visits[1]} width={width} height={height} /> : <View style={{ width, height }} />}
                </View>
                <View importantForAccessibility={page === 2 ? "auto" : "no-hide-descendants"}>
                    {visits[2] > 0 ? <PrivateStep visit={visits[2]} width={width} height={height} /> : <View style={{ width, height }} />}
                </View>
                <View importantForAccessibility={page === 3 ? "auto" : "no-hide-descendants"}>
                    {visits[3] > 0 ? <OpenSourceStep visit={visits[3]} width={width} height={height} /> : <View style={{ width, height }} />}
                </View>
            </Animated.ScrollView>

            {page < LAST_STEP ? (
                <Pressable
                    testID="onboarding-skip"
                    accessibilityRole="button"
                    onPress={() => {
                        appHaptics.dismiss();
                        leave();
                    }}
                    hitSlop={12}
                    className="absolute right-3 h-11 justify-center px-3"
                    style={{ top: insets.top + 6 }}
                >
                    <Text className="font-sans text-[15px] font-semibold text-muted">{t("onboarding.skip")}</Text>
                </Pressable>
            ) : null}

            <Animated.View
                pointerEvents={ready ? "box-none" : "none"}
                className="absolute left-0 right-0 bottom-0 items-center px-6"
                style={[{ paddingBottom: insets.bottom + 16 }, controlsStyle]}
            >
                <View
                    accessible
                    accessibilityLabel={t("onboarding.stepAccessibility", { current: page + 1, total: STEP_COUNT })}
                    className="mb-5 flex-row items-center gap-[6px]"
                >
                    {Array.from({ length: STEP_COUNT }, (_, index) => (
                        <Dot key={index} index={index} scroll={scroll} width={width} />
                    ))}
                </View>
                <PrimaryButton
                    testID="onboarding-next"
                    label={page === LAST_STEP ? t("onboarding.getStarted") : t("onboarding.continue")}
                    onPress={() => (page === LAST_STEP ? leave() : goTo(page + 1))}
                />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        zIndex: 100,
        elevation: 100,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});
