import { Image } from "expo-image";
import { memo, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

import type { FlyingNote } from "./money-burst";

const FLIGHT_DURATION = 640;
// Where the eased flight sits at MONEY_IMPACT_DELAY, so bills reach the number before they fade.
const LANDING_PROGRESS = 0.94;

export const FlyingMoney = memo(function FlyingMoney({ note }: { note: FlyingNote }) {
    const progress = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.get(), [0, 0.08, LANDING_PROGRESS, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
        transform: [
            {
                translateX: interpolate(
                    progress.get(),
                    [0, 0.52, LANDING_PROGRESS],
                    [note.startX, note.startX * 0.48 + note.curveX, 0],
                    Extrapolation.CLAMP,
                ),
            },
            {
                translateY: interpolate(
                    progress.get(),
                    [0, 0.52, LANDING_PROGRESS],
                    [note.startY, note.startY * 0.46 - 34, 0],
                    Extrapolation.CLAMP,
                ),
            },
            {
                rotateZ: `${interpolate(
                    progress.get(),
                    [0, 0.55, LANDING_PROGRESS],
                    [note.startRotation, note.middleRotation, note.endRotation],
                    Extrapolation.CLAMP,
                )}deg`,
            },
            {
                scale: interpolate(
                    progress.get(),
                    [0, 0.12, 0.78, LANDING_PROGRESS, 1],
                    [0.45, 1.04, 0.82, 0.5, 0.28],
                    Extrapolation.CLAMP,
                ),
            },
            { scaleX: note.mirrorX },
        ],
    }));

    useEffect(() => {
        progress.set(0);
        progress.set(
            withDelay(
                note.delay,
                withTiming(1, {
                    duration: FLIGHT_DURATION,
                    easing: Easing.inOut(Easing.cubic),
                    reduceMotion: ReduceMotion.System,
                }),
                ReduceMotion.System,
            ),
        );

        return () => cancelAnimation(progress);
    }, [note.delay, progress]);

    return (
        <Animated.View
            style={[
                styles.note,
                {
                    left: note.targetX,
                    top: note.targetY,
                    width: note.size,
                    height: note.size,
                    marginLeft: note.size / -2,
                    marginTop: note.size / -2,
                },
                animatedStyle,
            ]}
        >
            <Image
                source={require("@/assets/images/android-icon-foreground.png")}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    note: {
        position: "absolute",
    },
});
