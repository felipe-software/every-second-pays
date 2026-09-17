import { BlurTargetView, BlurView } from "expo-blur";
import { memo, useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { MONEY_IMPACT_DELAY, type MoneyTransfer } from "./money-counter-celebration";
import { useEarningsTheme } from "./theme";

const SATURATION_IMPACT_OPACITY: Record<MoneyTransfer["target"], { dark: number; light: number }> = {
    cents: { dark: 0.08, light: 0.1 },
    whole: { dark: 0.18, light: 0.22 },
};

export const EarningsBackground = memo(function EarningsBackground({
    celebrationId,
    celebrationTarget,
}: {
    celebrationId?: number;
    celebrationTarget?: MoneyTransfer["target"];
}) {
    const target = useRef<View | null>(null);
    const { colors, isDark } = useEarningsTheme();
    const saturationPulse = useSharedValue(0);
    const pulseStyle = useAnimatedStyle(() => ({
        opacity: saturationPulse.get(),
    }));

    useEffect(() => {
        if (!celebrationId || !celebrationTarget) return;

        cancelAnimation(saturationPulse);
        saturationPulse.set(0);
        const impactOpacity = SATURATION_IMPACT_OPACITY[celebrationTarget][isDark ? "dark" : "light"];
        saturationPulse.set(withDelay(
            MONEY_IMPACT_DELAY,
            withSequence(
                ReduceMotion.System,
                withTiming(impactOpacity, {
                    duration: 105,
                    easing: Easing.out(Easing.quad),
                    reduceMotion: ReduceMotion.System,
                }),
                withTiming(0, {
                    duration: 360,
                    easing: Easing.out(Easing.cubic),
                    reduceMotion: ReduceMotion.System,
                }),
            ),
            ReduceMotion.System,
        ));

        return () => cancelAnimation(saturationPulse);
    }, [celebrationId, celebrationTarget, isDark, saturationPulse]);

    return (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
            <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
                <View className="absolute inset-0 bg-canvas" />
                <View className="absolute -top-[270px] left-1/2 h-[520px] w-[620px] -translate-x-1/2 rounded-full bg-accent/15 dark:bg-accent/25" />
                <Animated.View
                    style={[styles.saturationPulse, { backgroundColor: colors.accent }, pulseStyle]}
                />
                <View className="absolute -top-[205px] left-1/2 h-[360px] w-[420px] -translate-x-1/2 rounded-full bg-sheet/40" />
            </BlurTargetView>
            <BlurView
                testID="earnings-background-blur"
                blurTarget={target}
                blurMethod="dimezisBlurView"
                intensity={72}
                blurReductionFactor={Platform.OS === "android" && !isDark ? 1 : undefined}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    saturationPulse: {
        position: "absolute",
        top: -270,
        left: "50%",
        width: 620,
        height: 520,
        marginLeft: -310,
        borderRadius: 260,
    },
});
