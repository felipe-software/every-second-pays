import type { AnimatedViewStyle } from "../components/tab-bar-layers/shared";
import { getTabWidth } from "../utils/animation";
import { useMemo } from "react";
import { Platform } from "react-native";
import {
    clamp,
    type SharedValue,
    useAnimatedStyle,
} from "react-native-reanimated";

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
    // The width only follows the track layout. Keeping it out of the
    // per-frame style leaves that update transform-only.
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

    return useMemo(
        () => ({ maskStyle: [maskWidthStyle, maskTransformStyle] }),
        [maskTransformStyle, maskWidthStyle],
    );
};

// MaskedView has no web implementation. An animated CSS
// `clip-path: inset(... round ...)` is not an option either: Safari
// occasionally paints a frame with the inset applied but the rounding
// dropped, flashing the whole pill as a rectangle. Instead the pill is a
// statically sized border-radius + overflow:hidden box (a stable rounded
// clip) animated purely with transforms — the same translate/scale the
// native mask element uses — while contentStyle applies the exact
// inverse transform so the clipped content stays fixed to the track.
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

        // Both the clip box and this wrapper transform about their own
        // centres, so inverting the box transform needs the centre offsets:
        // solving box(wrapper(y)) = y for translate-then-scale transforms
        // gives the translations below alongside the reciprocal scales.
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
                        boxCenterX -
                        contentCenterX +
                        (contentCenterX - boxCenterX - pillLeft - pillShiftX) /
                            scaleX,
                },
                {
                    translateY:
                        boxCenterY -
                        contentCenterY +
                        (contentCenterY - boxCenterY - pillTop) / scaleY,
                },
                { scaleX: 1 / scaleX },
                { scaleY: 1 / scaleY },
            ],
        };
    });

    return useMemo(
        () => ({ clipStyle, contentStyle }),
        [clipStyle, contentStyle],
    );
};

// Each platform renders only one of the two pill implementations, so the
// other one's mappers would run every frame without a view to update.
export const usePillShapeStyles =
    Platform.OS === "web" ? useWebPillShapeStyles : useNativePillShapeStyles;
