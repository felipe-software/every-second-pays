import { BlurTargetView, BlurView } from "expo-blur";
import { memo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useEarningsTheme } from "./theme";

export const EarningsBackground = memo(function EarningsBackground() {
    const target = useRef<View | null>(null);
    const { isDark } = useEarningsTheme();

    return (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
            <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
                <View className="absolute inset-0 bg-canvas" />
                <View className="absolute -top-[270px] left-1/2 h-[520px] w-[620px] -translate-x-1/2 rounded-full bg-accent/15 dark:bg-accent/25" />
                <View className="absolute -top-[205px] left-1/2 h-[360px] w-[420px] -translate-x-1/2 rounded-full bg-sheet/40" />
            </BlurTargetView>
            <BlurView
                testID="earnings-background-blur"
                blurTarget={target}
                blurMethod="dimezisBlurView"
                intensity={40}
                blurReductionFactor={0.4}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
});
