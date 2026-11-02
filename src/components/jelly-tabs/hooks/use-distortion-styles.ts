import { useMemo } from "react";
import { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

interface DistortionStylesOptions {
    pointerLocalY: SharedValue<number>;
    pressedScale: SharedValue<number>;
    scaleX: SharedValue<number>;
    touchFeedbackOpacity: SharedValue<number>;
    touchFeedbackRadius: number;
    trackHeight: number;
    trackWidth: SharedValue<number>;
    transformOriginX: SharedValue<number>;
    translateY: SharedValue<number>;
}

export const useDistortionStyles = ({
    pointerLocalY,
    pressedScale,
    scaleX,
    touchFeedbackOpacity,
    touchFeedbackRadius,
    trackHeight,
    trackWidth,
    transformOriginX,
    translateY,
}: DistortionStylesOptions) => {
    // Reanimated Web drops animated transformOrigin updates, so pair translations with a static origin.
    const tabbarOriginStyle = useMemo<{ transformOrigin: [string, number, number] }>(
        () => ({
            transformOrigin: ["50%", trackHeight / 2, 0],
        }),
        [trackHeight],
    );
    const tabbarStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: transformOriginX.value - trackWidth.value / 2,
            },
            { translateY: translateY.value },
            { scaleX: scaleX.value },
            {
                translateX: trackWidth.value / 2 - transformOriginX.value,
            },
        ],
    }));

    const pressedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressedScale.value }],
    }));

    // Both glow layers share this style, so each frame runs one mapper for the two views.
    const touchFeedbackStyle = useAnimatedStyle(() => ({
        opacity: touchFeedbackOpacity.value,
        transform: [
            {
                translateX: transformOriginX.value - touchFeedbackRadius,
            },
            {
                translateY: pointerLocalY.value - touchFeedbackRadius,
            },
        ],
    }));

    return { pressedStyle, tabbarOriginStyle, tabbarStyle, touchFeedbackStyle };
};
