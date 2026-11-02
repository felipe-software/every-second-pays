/* eslint-disable react-hooks/immutability */
import type { DistortionConfig } from "../constants";
import { getPointerOrigin, rubberBand } from "../utils/animation";
import { useCallback } from "react";
import { cancelAnimation, clamp, type SharedValue, withSpring } from "react-native-reanimated";

interface DistortionHandlersOptions {
    distanceForMaxDistortion: number;
    distortion: DistortionConfig;
    dragOriginY: SharedValue<number>;
    pointerInitialAbsoluteX: SharedValue<number>;
    pointerInitialLocalX: SharedValue<number>;
    pointerLocalY: SharedValue<number>;
    pressedScale: SharedValue<number>;
    scaleX: SharedValue<number>;
    touchFeedbackOpacity: SharedValue<number>;
    trackHeight: number;
    trackWidth: SharedValue<number>;
    transformOriginX: SharedValue<number>;
    translateY: SharedValue<number>;
}

export const useDistortionHandlers = ({
    distanceForMaxDistortion,
    distortion,
    dragOriginY,
    pointerInitialAbsoluteX,
    pointerInitialLocalX,
    pointerLocalY,
    pressedScale,
    scaleX,
    touchFeedbackOpacity,
    trackHeight,
    trackWidth,
    transformOriginX,
    translateY,
}: DistortionHandlersOptions) => {
    const begin = useCallback(
        (localX: number, localY: number, absoluteX: number) => {
            "worklet";

            cancelAnimation(translateY);
            cancelAnimation(scaleX);
            cancelAnimation(pressedScale);
            cancelAnimation(touchFeedbackOpacity);

            dragOriginY.value = translateY.value;
            pressedScale.value = withSpring(distortion.pressedScale, distortion.spring);
            pointerInitialLocalX.value = localX;
            pointerInitialAbsoluteX.value = absoluteX;
            // Tabbar-local coordinates, so the parent transform moves the glow together with the surface.
            pointerLocalY.value = clamp(localY, 0, trackHeight);
            transformOriginX.value = clamp(localX, 0, trackWidth.value);
            touchFeedbackOpacity.value = withSpring(1, distortion.spring);
        },
        [
            distortion,
            dragOriginY,
            pointerInitialAbsoluteX,
            pointerInitialLocalX,
            pointerLocalY,
            pressedScale,
            scaleX,
            touchFeedbackOpacity,
            trackHeight,
            trackWidth,
            transformOriginX,
            translateY,
        ],
    );

    const update = useCallback(
        (verticalTranslation: number, absoluteX: number, localX: number | null = null) => {
            "worklet";

            const appliedTranslation =
                rubberBand(verticalTranslation, trackHeight, distortion.verticalDrag.rubberBand) *
                distortion.verticalDrag.follow;
            const progress = Math.min(Math.abs(verticalTranslation) / Math.max(distanceForMaxDistortion, 0.0001), 1);

            translateY.value = dragOriginY.value + appliedTranslation;
            scaleX.value = 1 - progress * distortion.verticalDrag.distortion;
            transformOriginX.value =
                localX === null
                    ? getPointerOrigin(
                          absoluteX,
                          trackWidth.value,
                          pointerInitialAbsoluteX.value,
                          pointerInitialLocalX.value,
                      )
                    : clamp(localX, 0, trackWidth.value);
        },
        [
            distanceForMaxDistortion,
            distortion,
            dragOriginY,
            pointerInitialAbsoluteX,
            pointerInitialLocalX,
            scaleX,
            trackHeight,
            trackWidth,
            transformOriginX,
            translateY,
        ],
    );

    const end = useCallback(() => {
        "worklet";

        translateY.value = withSpring(0, distortion.spring);
        scaleX.value = withSpring(1, distortion.spring, (finished) => {
            if (finished) {
                transformOriginX.value = trackWidth.value / 2;
            }
        });
        pressedScale.value = withSpring(1, distortion.spring);
        touchFeedbackOpacity.value = withSpring(0, distortion.spring);
    }, [distortion, pressedScale, scaleX, touchFeedbackOpacity, trackWidth, transformOriginX, translateY]);

    const setTrackWidth = useCallback(
        (width: number) => {
            trackWidth.value = width;
            transformOriginX.value = width / 2;
        },
        [trackWidth, transformOriginX],
    );

    return { begin, end, setTrackWidth, update };
};
