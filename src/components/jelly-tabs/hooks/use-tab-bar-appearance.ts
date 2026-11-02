import { DEFAULT_TAB_BAR_COLORS, DEFAULT_TAB_BAR_OPACITY, resolveTabBarConfig } from "../constants";
import type { JellyTabBarHeadlessProps } from "../types";
import { getGeometry, getTouchFeedbackVisuals } from "../utils/tab-bar-visuals";
import { useShallowStable } from "./use-shallow-stable";
import { useMemo } from "react";

type TabBarAppearanceOptions = Pick<
    JellyTabBarHeadlessProps,
    "colors" | "config" | "opacity" | "touchFeedbackColor" | "touchFeedbackOpacity" | "touchFeedbackScale"
> & {
    displayScale: number;
};

export const useTabBarAppearance = ({
    colors,
    config,
    displayScale,
    opacity,
    touchFeedbackColor,
    touchFeedbackOpacity,
    touchFeedbackScale,
}: TabBarAppearanceOptions) => {
    const resolvedConfig = useMemo(() => resolveTabBarConfig(config), [config]);
    const stableColors = useShallowStable(colors);
    const stableOpacity = useShallowStable(opacity);
    const resolvedColors = useMemo(
        () => ({
            ...DEFAULT_TAB_BAR_COLORS,
            ...stableColors,
        }),
        [stableColors],
    );
    const resolvedOpacity = useMemo(
        () => ({
            ...DEFAULT_TAB_BAR_OPACITY,
            ...stableOpacity,
        }),
        [stableOpacity],
    );
    const geometry = useMemo(
        () => getGeometry(resolvedConfig.layout, displayScale),
        [displayScale, resolvedConfig.layout],
    );
    const touchFeedbackColorValue = touchFeedbackColor ?? resolvedColors.selectedSurface;
    const touchFeedback = useMemo(
        () =>
            getTouchFeedbackVisuals(resolvedConfig.distortion.touchFeedback, displayScale, {
                color: touchFeedbackColorValue,
                opacity: touchFeedbackOpacity,
                scale: touchFeedbackScale,
            }),
        [
            displayScale,
            resolvedConfig.distortion.touchFeedback,
            touchFeedbackColorValue,
            touchFeedbackOpacity,
            touchFeedbackScale,
        ],
    );

    return { geometry, resolvedColors, resolvedConfig, resolvedOpacity, touchFeedback };
};
