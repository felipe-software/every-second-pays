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

import { type FlyingNote, MAX_NOTE_SIZE } from "./money-burst";

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
                scale:
                    interpolate(
                        progress.get(),
                        [0, 0.12, 0.78, LANDING_PROGRESS, 1],
                        [0.45, 1.04, 0.82, 0.5, 0.28],
                        Extrapolation.CLAMP,
                    ) *
                    (note.size / MAX_NOTE_SIZE),
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
        <Animated.View style={[styles.note, { left: note.targetX, top: note.targetY }, animatedStyle]}>
            <Image
                source={require("@/assets/images/android-icon-foreground.png")}
                cachePolicy="memory-disk"
                contentFit="contain"
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    // One box size for every note keeps the bill's decode cached; each note's size is applied as a scale.
    note: {
        position: "absolute",
        width: MAX_NOTE_SIZE,
        height: MAX_NOTE_SIZE,
        marginLeft: MAX_NOTE_SIZE / -2,
        marginTop: MAX_NOTE_SIZE / -2,
    },
});
