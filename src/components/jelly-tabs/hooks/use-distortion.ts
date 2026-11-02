import type { TabBarConfig } from "../constants";
import { useDistortionHandlers } from "./use-distortion-handlers";
import { useDistortionStyles } from "./use-distortion-styles";
import { useSharedValue } from "react-native-reanimated";

export const useDistortion = (config: TabBarConfig, displayScale = 1, touchFeedbackRadius = 0) => {
    const geometryScale = displayScale > 0 ? displayScale : 1;
    const { distortion, layout } = config;
    const trackHeight = layout.trackHeight * geometryScale;
    const distanceForMaxDistortion = distortion.verticalDrag.distanceForMaxDistortion * geometryScale;

    const trackWidth = useSharedValue(0);
    const translateY = useSharedValue(0);
    const dragOriginY = useSharedValue(0);
    const scaleX = useSharedValue(1);
    const pressedScale = useSharedValue(1);
    const touchFeedbackOpacity = useSharedValue(0);

    const pointerInitialLocalX = useSharedValue(0);
    const pointerInitialAbsoluteX = useSharedValue(0);
    const pointerLocalY = useSharedValue(trackHeight / 2);
    const transformOriginX = useSharedValue(0);

    const { begin, end, setTrackWidth, update } = useDistortionHandlers({
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
    });
    const { pressedStyle, tabbarOriginStyle, tabbarStyle, touchFeedbackStyle } = useDistortionStyles({
        pointerLocalY,
        pressedScale,
        scaleX,
        touchFeedbackOpacity,
        touchFeedbackRadius,
        trackHeight,
        trackWidth,
        transformOriginX,
        translateY,
    });

    return {
        begin,
        end,
        pressedStyle,
        setTrackWidth,
        tabbarOriginStyle,
        tabbarStyle,
        touchFeedbackStyle,
        update,
    };
};
