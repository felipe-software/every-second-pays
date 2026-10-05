import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { useEarningsTheme } from "./theme";

/** A status dot that sends out a soft ring while a source is earning. */
export function LiveDot({ live, size = 8 }: { live: boolean; size?: number }) {
    const { colors } = useEarningsTheme();
    const pulse = useSharedValue(0);
    const ringStyle = useAnimatedStyle(() => ({
        opacity: 0.55 * (1 - pulse.get()),
        transform: [{ scale: 1 + pulse.get() * 1.6 }],
    }));

    useEffect(() => {
        if (!live) {
            cancelAnimation(pulse);
            pulse.set(0);
            return;
        }
        pulse.set(withRepeat(
            withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
            -1,
            false,
            undefined,
            ReduceMotion.System,
        ));
        return () => cancelAnimation(pulse);
    }, [live, pulse]);

    return (
        <View style={{ width: size, height: size }}>
            {live ? (
                <Animated.View
                    pointerEvents="none"
                    style={[{ position: "absolute", inset: 0, borderRadius: size, backgroundColor: colors.accent }, ringStyle]}
                />
            ) : null}
            <View style={{ flex: 1, borderRadius: size, backgroundColor: live ? colors.accent : colors.track }} />
        </View>
    );
}
