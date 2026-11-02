import { SelectedTabIndexContext } from "./tab-bar-layers";
import { TabBarBody } from "./tab-bar-body";
import type { JellyTabBarHeadlessProps } from "../types";
import { usePillJelly } from "../hooks/use-pill-jelly";
import { useTabBarAppearance } from "../hooks/use-tab-bar-appearance";
import { useTabElements } from "../hooks/use-tab-elements";
import { useTabEventHandlers } from "../hooks/use-tab-event-handlers";
import { useTrackLayout } from "../hooks/use-track-layout";
import { clamp01 } from "../utils/tab-bar-visuals";
import { useRef, useState } from "react";
import type { View } from "react-native";

const getSelectedItemIndex = (selectedIndex: number | null, itemCount: number) => {
    if (selectedIndex === null || !Number.isFinite(selectedIndex) || selectedIndex < 0 || itemCount === 0) {
        return null;
    }

    return Math.min(selectedIndex, itemCount - 1);
};

export const JellyTabBarHeadless = ({
    backdrop,
    colors,
    config,
    displayScale = 1,
    items,
    maxWidth = 400,
    onTabChange,
    onTabLongPress,
    onTabPress,
    opacity,
    progress,
    recording = false,
    selectedIndex,
    selectedBackdrop,
    touchFeedbackColor,
    touchFeedbackEnabled = true,
    touchFeedbackOpacity,
    touchFeedbackScale,
}: JellyTabBarHeadlessProps) => {
    const trackRef = useRef<View>(null);
    const [uncontrolledSelectedIndex, setUncontrolledSelectedIndex] = useState(0);
    // Web only: sizes the pill clip box statically so its animation stays transform-only.
    const [webTrackWidth, setWebTrackWidth] = useState(0);
    const { geometry, resolvedColors, resolvedConfig, resolvedOpacity, touchFeedback } = useTabBarAppearance({
        colors,
        config,
        displayScale,
        opacity,
        touchFeedbackColor,
        touchFeedbackOpacity,
        touchFeedbackScale,
    });
    const { handleTabChange, handleTabLongPress, handleTabPress } = useTabEventHandlers({
        items,
        onTabChange,
        onTabLongPress,
        onTabPress,
        setUncontrolledSelectedIndex,
    });
    const { renderedItems, tabs } = useTabElements({
        displayScale,
        iconSize: resolvedConfig.layout.iconSize * displayScale,
        itemHeight: geometry.itemHeight,
        items,
        resolvedColors,
        resolvedOpacity,
    });
    const tabCount = tabs.length;
    const semanticSelectedIndex = getSelectedItemIndex(
        selectedIndex === undefined ? uncontrolledSelectedIndex : selectedIndex,
        tabCount,
    );
    const hasTabLongPress = Boolean(onTabLongPress);
    const pillJelly = usePillJelly({
        tabCount,
        config: resolvedConfig,
        recording,
        displayScale,
        touchFeedbackRadius: touchFeedback.radius,
        controlledSelectedIndex: selectedIndex,
        controlledProgress: progress,
        onTabChange: handleTabChange,
        onTabPress: onTabPress ? handleTabPress : undefined,
        onTabLongPress: hasTabLongPress ? handleTabLongPress : undefined,
    });
    const handleTrackLayout = useTrackLayout({
        setTrackWidth: pillJelly.setTrackWidth,
        setWebTrackPageX: pillJelly.setWebTrackPageX,
        setWebTrackWidth,
        trackRef,
    });

    return (
        <SelectedTabIndexContext.Provider value={semanticSelectedIndex}>
            <TabBarBody
                activeItemStyle={pillJelly.activeItemStyle}
                backdrop={backdrop}
                geometry={geometry}
                gesture={pillJelly.gesture}
                items={renderedItems}
                maxWidth={maxWidth}
                onActivate={pillJelly.activateTab}
                onLongPress={hasTabLongPress ? handleTabLongPress : undefined}
                onTrackLayout={handleTrackLayout}
                panelStyle={pillJelly.panelStyle}
                pillClipStyle={pillJelly.pillClipStyle}
                pillContentStyle={pillJelly.pillContentStyle}
                pillMaskStyle={pillJelly.pillMaskStyle}
                pillVisible={semanticSelectedIndex !== null}
                pressedStyle={pillJelly.pressedStyle}
                selectedBackdrop={selectedBackdrop}
                selectedSurfaceColor={resolvedColors.selectedSurface}
                selectedSurfaceOpacity={clamp01(resolvedOpacity.selectedSurface)}
                surfaceColor={resolvedColors.surface}
                surfaceOpacity={clamp01(resolvedOpacity.surface)}
                tabbarOriginStyle={pillJelly.tabbarOriginStyle}
                tabbarStyle={pillJelly.tabbarStyle}
                tabCount={tabCount}
                tabs={tabs}
                touchFeedback={touchFeedbackEnabled ? touchFeedback : undefined}
                touchFeedbackStyle={pillJelly.touchFeedbackStyle}
                trackRef={trackRef}
                webTrackWidth={webTrackWidth}
            />
        </SelectedTabIndexContext.Provider>
    );
};

export const JellyTabs = JellyTabBarHeadless;
