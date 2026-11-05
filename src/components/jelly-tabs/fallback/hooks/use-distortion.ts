import { useMemo, useState } from "react";
import { cancelAnimation, clamp, makeMutable, useAnimatedStyle, withSpring } from "react-native-reanimated";

import type { DistortionConfig, TabBarConfig } from "../constants";
import { getPointerOrigin, rubberBand } from "../utils/animation";

interface DistortionSettings {
    distanceForMaxDistortion: number;
    distortion: DistortionConfig;
    trackHeight: number;
}

const createDistortionValues = (trackHeight: number) => ({
    dragOriginY: makeMutable(0),
    pointerInitialAbsoluteX: makeMutable(0),
    pointerInitialLocalX: makeMutable(0),
    pointerLocalY: makeMutable(trackHeight / 2),
    pressedScale: makeMutable(1),
    scaleX: makeMutable(1),
    touchFeedbackOpacity: makeMutable(0),
    trackWidth: makeMutable(0),
    transformOriginX: makeMutable(0),
    translateY: makeMutable(0),
});

type DistortionValues = ReturnType<typeof createDistortionValues>;

const createDistortionHandlers = (values: DistortionValues, settings: DistortionSettings) => {
    const { distanceForMaxDistortion, distortion, trackHeight } = settings;

    const begin = (localX: number, localY: number, absoluteX: number) => {
        "worklet";

        cancelAnimation(values.translateY);
        cancelAnimation(values.scaleX);
        cancelAnimation(values.pressedScale);
        cancelAnimation(values.touchFeedbackOpacity);

        values.dragOriginY.value = values.translateY.value;
        values.pressedScale.value = withSpring(distortion.pressedScale, distortion.spring);
        values.pointerInitialLocalX.value = localX;
        values.pointerInitialAbsoluteX.value = absoluteX;

        values.pointerLocalY.value = clamp(localY, 0, trackHeight);
        values.transformOriginX.value = clamp(localX, 0, values.trackWidth.value);
        values.touchFeedbackOpacity.value = withSpring(1, distortion.spring);
    };

    const update = (verticalTranslation: number, absoluteX: number, localX: number | null = null) => {
        "worklet";

        const appliedTranslation =
            rubberBand(verticalTranslation, trackHeight, distortion.verticalDrag.rubberBand) *
            distortion.verticalDrag.follow;
        const progress = Math.min(Math.abs(verticalTranslation) / Math.max(distanceForMaxDistortion, 0.0001), 1);
        const trackWidth = values.trackWidth.value;

        values.translateY.value = values.dragOriginY.value + appliedTranslation;
        values.scaleX.value = 1 - progress * distortion.verticalDrag.distortion;
        values.transformOriginX.value =
            localX === null
                ? getPointerOrigin(
                      absoluteX,
                      trackWidth,
                      values.pointerInitialAbsoluteX.value,
                      values.pointerInitialLocalX.value,
                  )
                : clamp(localX, 0, trackWidth);
    };

    const end = () => {
        "worklet";

        values.translateY.value = withSpring(0, distortion.spring);
        values.scaleX.value = withSpring(1, distortion.spring, (finished) => {
            if (finished) {
                values.transformOriginX.value = values.trackWidth.value / 2;
            }
        });
        values.pressedScale.value = withSpring(1, distortion.spring);
        values.touchFeedbackOpacity.value = withSpring(0, distortion.spring);
    };

    const setTrackWidth = (width: number) => {
        values.trackWidth.value = width;
        values.transformOriginX.value = width / 2;
    };

    return { begin, end, setTrackWidth, update };
};

const useDistortionStyles = (values: DistortionValues, touchFeedbackRadius: number) => {
    const { pointerLocalY, pressedScale, scaleX, touchFeedbackOpacity, trackWidth, transformOriginX, translateY } =
        values;
    const tabbarStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: transformOriginX.value - trackWidth.value / 2 },
            { translateY: translateY.value },
            { scaleX: scaleX.value },
            { translateX: trackWidth.value / 2 - transformOriginX.value },
        ],
    }));
    const pressedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressedScale.value }],
    }));
    const touchFeedbackStyle = useAnimatedStyle(() => ({
        opacity: touchFeedbackOpacity.value,
        transform: [
            { translateX: transformOriginX.value - touchFeedbackRadius },
            { translateY: pointerLocalY.value - touchFeedbackRadius },
        ],
    }));

    return { pressedStyle, tabbarStyle, touchFeedbackStyle };
};

export const useDistortion = (config: TabBarConfig, displayScale = 1, touchFeedbackRadius = 0) => {
    const geometryScale = displayScale > 0 ? displayScale : 1;
    const { distortion, layout } = config;
    const trackHeight = layout.trackHeight * geometryScale;
    const distanceForMaxDistortion = distortion.verticalDrag.distanceForMaxDistortion * geometryScale;
    const [values] = useState(() => createDistortionValues(trackHeight));
    const handlers = useMemo(
        () => createDistortionHandlers(values, { distanceForMaxDistortion, distortion, trackHeight }),
        [distanceForMaxDistortion, distortion, trackHeight, values],
    );
    const tabbarOriginStyle = useMemo(() => {
        const transformOrigin: [string, number, number] = ["50%", trackHeight / 2, 0];
        return { transformOrigin };
    }, [trackHeight]);
    const styles = useDistortionStyles(values, touchFeedbackRadius);

    return { ...handlers, ...styles, tabbarOriginStyle };
};
