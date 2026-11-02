import type { AnimatedViewStyle } from "../components/tab-bar-layers/shared";
import { getTabWidth } from "../utils/animation";
import { useMemo } from "react";
import { Platform } from "react-native";
import { clamp, type SharedValue, useAnimatedStyle } from "react-native-reanimated";

export interface PillShapeInputs {
    baseScaleX: SharedValue<number>;
    baseScaleY: SharedValue<number>;
    filteredVelocity: SharedValue<number>;
    itemHeight: number;
    maskOverscanX: number;
    maskOverscanY: number;
    tabCount: number;
    trackHeight: number;
    trackInset: number;
    trackWidth: SharedValue<number>;
    value: SharedValue<number>;
}

export interface PillShapeStyles {
    clipStyle?: AnimatedViewStyle;
    contentStyle?: AnimatedViewStyle;
    maskStyle?: AnimatedViewStyle;
}

const useNativePillShapeStyles = ({
    baseScaleX,
    baseScaleY,
    filteredVelocity,
    tabCount,
    trackInset,
    trackWidth,
    value,
}: PillShapeInputs): PillShapeStyles => {
    // Separate from the per-frame style so that update stays transform-only.
    const maskWidthStyle = useAnimatedStyle(() => ({
        width: getTabWidth(trackWidth.value, trackInset, tabCount),
    }));

    const maskTransformStyle = useAnimatedStyle(() => {
        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        const velocity = filteredVelocity.value / 10;
        const scaleXCorrection = clamp(velocity * 0.75, -0.2, 0.2);
        const scaleYCorrection = clamp(velocity * 0.25, -0.2, 0.2);

        return {
            transform: [
                { translateX: value.value * tabWidth },
                { scaleX: baseScaleX.value / (1 - scaleXCorrection) },
                { scaleY: baseScaleY.value * (1 - scaleYCorrection) },
            ],
        };
    });

    return useMemo(() => ({ maskStyle: [maskWidthStyle, maskTransformStyle] }), [maskTransformStyle, maskWidthStyle]);
};

// No MaskedView on web, and Safari drops the rounding of an animated clip-path, so transform a box.
const useWebPillShapeStyles = ({
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
}: PillShapeInputs): PillShapeStyles => {
    const clipStyle = useAnimatedStyle(() => {
        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        const velocity = filteredVelocity.value / 10;
        const scaleXCorrection = clamp(velocity * 0.75, -0.2, 0.2);
        const scaleYCorrection = clamp(velocity * 0.25, -0.2, 0.2);

        return {
            transform: [
                { translateX: value.value * tabWidth },
                { scaleX: baseScaleX.value / (1 - scaleXCorrection) },
                { scaleY: baseScaleY.value * (1 - scaleYCorrection) },
            ],
        };
    });

    const contentStyle = useAnimatedStyle(() => {
        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        const velocity = filteredVelocity.value / 10;
        const scaleXCorrection = clamp(velocity * 0.75, -0.2, 0.2);
        const scaleYCorrection = clamp(velocity * 0.25, -0.2, 0.2);
        const scaleX = baseScaleX.value / (1 - scaleXCorrection);
        const scaleY = baseScaleY.value * (1 - scaleYCorrection);

        // Both boxes transform about their own centres, so inverting needs the centre offsets.
        const boxCenterX = tabWidth / 2;
        const boxCenterY = itemHeight / 2;
        const contentCenterX = (trackWidth.value + maskOverscanX * 2) / 2;
        const contentCenterY = (trackHeight + maskOverscanY * 2) / 2;
        const pillLeft = maskOverscanX + trackInset;
        const pillTop = maskOverscanY + trackInset;
        const pillShiftX = value.value * tabWidth;

        return {
            transform: [
                {
                    translateX:
                        boxCenterX - contentCenterX + (contentCenterX - boxCenterX - pillLeft - pillShiftX) / scaleX,
                },
                {
                    translateY: boxCenterY - contentCenterY + (contentCenterY - boxCenterY - pillTop) / scaleY,
                },
                { scaleX: 1 / scaleX },
                { scaleY: 1 / scaleY },
            ],
        };
    });

    return useMemo(() => ({ clipStyle, contentStyle }), [clipStyle, contentStyle]);
};

// Each platform renders one pill, so the other's mappers would run with no view to update.
export const usePillShapeStyles = Platform.OS === "web" ? useWebPillShapeStyles : useNativePillShapeStyles;
