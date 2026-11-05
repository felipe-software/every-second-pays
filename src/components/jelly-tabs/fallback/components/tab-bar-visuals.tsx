import { memo, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import type { PillJelly } from "../hooks/use-pill-jelly";
import { clamp01, type TabBarAppearance } from "../hooks/use-tab-bar-appearance";
import { InactiveTabsRow, PillLayer, SurfaceLayer, type TabElements, TouchFeedbackLayer } from "./tab-bar-layers";

interface TabBarVisualsProps {
    appearance: TabBarAppearance;
    backdrop: ReactNode;
    pillJelly: PillJelly;
    pillVisible: boolean;
    selectedBackdrop: ReactNode;
    tabs: TabElements;
    touchFeedbackEnabled: boolean;
    webTrackWidth: number;
}

export const TabBarVisuals = memo(function TabBarVisuals({
    appearance,
    backdrop,
    pillJelly,
    pillVisible,
    selectedBackdrop,
    tabs,
    touchFeedbackEnabled,
    webTrackWidth,
}: TabBarVisualsProps) {
    const { geometry, resolvedColors, resolvedOpacity } = appearance;
    const touchFeedback = touchFeedbackEnabled ? appearance.touchFeedback : undefined;
    const radius = geometry.trackHeight / 2;

    return (
        <Animated.View
            accessibilityElementsHidden
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, pillJelly.panelStyle]}
        >
            <SurfaceLayer
                backdrop={backdrop}
                color={resolvedColors.surface}
                opacity={clamp01(resolvedOpacity.surface)}
                radius={radius}
            />
            {touchFeedback && (
                <TouchFeedbackLayer
                    animatedStyle={pillJelly.touchFeedbackStyle}
                    radius={radius}
                    visuals={touchFeedback}
                />
            )}
            <InactiveTabsRow tabs={tabs} trackInset={geometry.trackInset} />
            <PillLayer
                activeItemStyle={pillJelly.activeItemStyle}
                clipStyle={pillJelly.pillClipStyle}
                contentStyle={pillJelly.pillContentStyle}
                geometry={geometry}
                maskStyle={pillJelly.pillMaskStyle}
                selectedBackdrop={selectedBackdrop}
                selectedSurfaceColor={resolvedColors.selectedSurface}
                selectedSurfaceOpacity={clamp01(resolvedOpacity.selectedSurface)}
                tabCount={tabs.length}
                tabs={tabs}
                touchFeedback={touchFeedback}
                touchFeedbackStyle={pillJelly.touchFeedbackStyle}
                visible={pillVisible}
                webTrackWidth={webTrackWidth}
            />
        </Animated.View>
    );
});
