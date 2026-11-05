import type { AnimatedViewStyle } from "../components/tab-bar-layers/shared";
import { getTabWidth } from "../utils/animation";
import { useMemo } from "react";
import { Platform } from "react-native";
import { clamp, type SharedValue, useAnimatedStyle } from "react-native-reanimated";

interface PillShapeInputs {
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

interface PillShapeStyles {
    clipStyle?: AnimatedViewStyle;
    contentStyle?: AnimatedViewStyle;
    maskStyle?: AnimatedViewStyle;
}

const getPillScale = (filteredVelocity: number, baseScaleX: number, baseScaleY: number) => {
    "worklet";

    const velocity = filteredVelocity / 10;
    return {
        x: baseScaleX / (1 - clamp(velocity * 0.75, -0.2, 0.2)),
        y: baseScaleY * (1 - clamp(velocity * 0.25, -0.2, 0.2)),
    };
};

const usePillTransformStyle = ({
    baseScaleX,
    baseScaleY,
    filteredVelocity,
    tabCount,
    trackInset,
    trackWidth,
    value,
}: PillShapeInputs) =>
    useAnimatedStyle(() => {
        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        const scale = getPillScale(filteredVelocity.value, baseScaleX.value, baseScaleY.value);

        return {
            transform: [{ translateX: value.value * tabWidth }, { scaleX: scale.x }, { scaleY: scale.y }],
        };
    });

const useNativePillShapeStyles = (inputs: PillShapeInputs): PillShapeStyles => {
    const { tabCount, trackInset, trackWidth } = inputs;
    const maskWidthStyle = useAnimatedStyle(() => ({
        width: getTabWidth(trackWidth.value, trackInset, tabCount),
    }));

    const maskTransformStyle = usePillTransformStyle(inputs);

    return useMemo(() => ({ maskStyle: [maskWidthStyle, maskTransformStyle] }), [maskTransformStyle, maskWidthStyle]);
};

const useWebPillShapeStyles = (inputs: PillShapeInputs): PillShapeStyles => {
    const { baseScaleX, baseScaleY, filteredVelocity, itemHeight, maskOverscanX, maskOverscanY } = inputs;
    const { tabCount, trackHeight, trackInset, trackWidth, value } = inputs;
    const clipStyle = usePillTransformStyle(inputs);

    const contentStyle = useAnimatedStyle(() => {
        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        const { x: scaleX, y: scaleY } = getPillScale(filteredVelocity.value, baseScaleX.value, baseScaleY.value);

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

export const usePillShapeStyles = Platform.OS === "web" ? useWebPillShapeStyles : useNativePillShapeStyles;
