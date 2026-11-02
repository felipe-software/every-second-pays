import { StyleSheet } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { useOnboardingTheme } from "./look";

export function OnboardingPageDot({ index, position }: { index: number; position: SharedValue<number> }) {
    const { colors } = useOnboardingTheme();
    const style = useAnimatedStyle(() => {
        const focus = Math.max(0, 1 - Math.abs(index - position.get()));
        return {
            width: 8 + 16 * focus,
            backgroundColor: interpolateColor(focus, [0, 1], [colors.track, colors.accent]),
        };
    });
    return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
    dot: {
        height: 8,
        borderRadius: 4,
    },
});
