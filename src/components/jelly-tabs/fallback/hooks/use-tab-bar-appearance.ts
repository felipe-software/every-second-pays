import { useMemo } from "react";

import type { TabBarGeometry, TouchFeedbackVisuals } from "../components/tab-bar-layers";
import {
    type DeepPartial,
    DEFAULT_TAB_BAR_COLORS,
    DEFAULT_TAB_BAR_OPACITY,
    resolveTabBarConfig,
    type TabBarColors,
    type TabBarConfig,
    type TabBarOpacity,
} from "../constants";
import { useShallowStable } from "./use-shallow-stable";

interface TabBarAppearanceOptions {
    colors?: Partial<TabBarColors>;
    config?: DeepPartial<TabBarConfig>;
    displayScale?: number;
    opacity?: Partial<TabBarOpacity>;
    touchFeedbackColor?: string;
    touchFeedbackOpacity?: number;
    touchFeedbackScale?: number;
}

export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const getGeometry = (layout: TabBarConfig["layout"], displayScale: number): TabBarGeometry => ({
    itemHeight: layout.itemHeight * displayScale,
    maskOverscanX: layout.maskOverscanX * displayScale,
    maskOverscanY: layout.maskOverscanY * displayScale,
    trackHeight: layout.trackHeight * displayScale,
    trackInset: layout.trackInset * displayScale,
});

const getTouchFeedbackVisuals = (
    config: TabBarConfig["distortion"]["touchFeedback"],
    displayScale: number,
    overrides: { color: string; opacity?: number; scale?: number },
): TouchFeedbackVisuals => {
    const centerOpacity = clamp01(overrides.opacity ?? config.opacity);
    const radius = config.radius * Math.max(overrides.scale ?? config.scale, 0) * displayScale;

    return {
        centerOpacity,
        color: overrides.color,
        diameter: radius * 2,
        middleOpacity: centerOpacity * config.middleOpacityRatio,
        radius,
    };
};

export const useTabBarAppearance = ({
    colors,
    config,
    displayScale = 1,
    opacity,
    touchFeedbackColor,
    touchFeedbackOpacity,
    touchFeedbackScale,
}: TabBarAppearanceOptions) => {
    const resolvedConfig = useMemo(() => resolveTabBarConfig(config), [config]);
    const stableColors = useShallowStable(colors);
    const stableOpacity = useShallowStable(opacity);
    const resolvedColors = useMemo(() => ({ ...DEFAULT_TAB_BAR_COLORS, ...stableColors }), [stableColors]);
    const resolvedOpacity = useMemo(() => ({ ...DEFAULT_TAB_BAR_OPACITY, ...stableOpacity }), [stableOpacity]);
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

    const iconSize = resolvedConfig.layout.iconSize * displayScale;

    return useMemo(
        () => ({ displayScale, geometry, iconSize, resolvedColors, resolvedConfig, resolvedOpacity, touchFeedback }),
        [displayScale, geometry, iconSize, resolvedColors, resolvedConfig, resolvedOpacity, touchFeedback],
    );
};

export type TabBarAppearance = ReturnType<typeof useTabBarAppearance>;
