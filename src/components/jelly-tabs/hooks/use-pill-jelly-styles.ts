import { getHorizontalPanelOffset } from "../utils/animation";
import type { PillJellySharedValues } from "./use-pill-jelly-shared-values";
import { usePillShapeStyles } from "./use-pill-shape-styles";
import { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";

interface PillJellyStylesOptions {
    geometryScale: number;
    itemHeight: number;
    maskOverscanX: number;
    maskOverscanY: number;
    sharedValues: PillJellySharedValues;
    tabCount: number;
    trackHeight: number;
    trackInset: number;
}

export const usePillJellyStyles = ({
    geometryScale,
    itemHeight,
    maskOverscanX,
    maskOverscanY,
    sharedValues,
    tabCount,
    trackHeight,
    trackInset,
}: PillJellyStylesOptions) => {
    const { baseScaleX, baseScaleY, filteredVelocity, pressProgress, rawPanelOffset, trackWidth, value } = sharedValues;

    const panelOffset = useDerivedValue(() => {
        return getHorizontalPanelOffset(rawPanelOffset.value, trackWidth.value, geometryScale);
    });

    const panelStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: panelOffset.value }],
    }));

    const { clipStyle, contentStyle, maskStyle } = usePillShapeStyles({
        baseScaleX,
        baseScaleY,
        filteredVelocity,
        itemHeight,
        maskOverscanX,
        maskOverscanY,
        tabCount,
        trackHeight,
        trackInset,
        trackWidth,
        value,
    });

    const activeItemStyle = useAnimatedStyle(() => {
        const scale = 1 + 0.2 * pressProgress.value;
        return { transform: [{ scaleX: scale }, { scaleY: scale }] };
    });

    return { activeItemStyle, clipStyle, contentStyle, maskStyle, panelStyle };
};
