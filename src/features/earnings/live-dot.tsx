import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { useEarningsTheme } from "./theme";

const PULSE_DURATION = 1800;

function pulseTiming(duration: number) {
    return withTiming(1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System });
}

export function LiveDot({ live, size = 8 }: { live: boolean; size?: number }) {
    const { colors } = useEarningsTheme();
    const isFocused = useIsFocused();
    const phase = useSharedValue(0);
    const ringStyle = useAnimatedStyle(() => {
        const remaining = 1 - phase.get();
        const pulse = 1 - remaining * remaining;
        return {
            opacity: 0.55 * (1 - pulse),
            transform: [{ scale: 1 + pulse * 1.6 }],
        };
    });

    useEffect(() => {
        if (!live) {
            cancelAnimation(phase);
            phase.set(0);
            return undefined;
        }
        // Hidden behind another tab, the ring holds its phase instead of drawing frames nobody sees.
        if (!isFocused) {
            cancelAnimation(phase);
            return undefined;
        }
        phase.set(
            withSequence(
                ReduceMotion.System,
                pulseTiming((1 - phase.get()) * PULSE_DURATION),
                withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }),
                withRepeat(pulseTiming(PULSE_DURATION), -1, false, undefined, ReduceMotion.System),
            ),
        );
        return () => cancelAnimation(phase);
    }, [isFocused, live, phase]);

    return (
        <View style={{ width: size, height: size }}>
            {live ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        { position: "absolute", inset: 0, borderRadius: size, backgroundColor: colors.accent },
                        ringStyle,
                    ]}
                />
            ) : null}
            <View style={{ flex: 1, borderRadius: size, backgroundColor: live ? colors.accent : colors.track }} />
        </View>
    );
}
