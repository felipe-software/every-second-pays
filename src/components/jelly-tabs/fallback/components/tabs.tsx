import { useRef } from "react";
import type { View } from "react-native";

import { useLatestTabHandlers } from "../hooks/use-latest-tab-handlers";
import { usePillJelly } from "../hooks/use-pill-jelly";
import { useStableArray } from "../hooks/use-stable-array";
import { useTabBarAppearance } from "../hooks/use-tab-bar-appearance";
import { useTabElements } from "../hooks/use-tab-elements";
import { useWebTrackMeasurement } from "../hooks/use-web-track-measurement";
import type { JellyTabBarHeadlessProps } from "../types";
import { areItemsEqual } from "../utils/navigation-tab-bar";
import { TabBarBody } from "./tab-bar-body";
import { SelectedTabIndexContext } from "./tab-bar-layers";

const DEFAULT_MAX_WIDTH = 400;

const getSelectedItemIndex = (
    controlledIndex: number | null | undefined,
    uncontrolledIndex: number,
    itemCount: number,
) => {
    const selectedIndex = controlledIndex === undefined ? uncontrolledIndex : controlledIndex;
    if (selectedIndex === null || !Number.isFinite(selectedIndex) || selectedIndex < 0 || itemCount === 0) {
        return null;
    }

    return Math.min(selectedIndex, itemCount - 1);
};

export const JellyTabBarHeadless = (props: JellyTabBarHeadlessProps) => {
    const trackRef = useRef<View>(null);
    const appearance = useTabBarAppearance(props);
    const handlers = useLatestTabHandlers(props);
    const renderedItems = useStableArray(props.items, areItemsEqual);
    const tabs = useTabElements({
        colors: appearance.resolvedColors,
        displayScale: appearance.displayScale,
        iconSize: appearance.iconSize,
        itemHeight: appearance.geometry.itemHeight,
        items: renderedItems,
        opacity: appearance.resolvedOpacity,
    });
    const selectedIndex = getSelectedItemIndex(props.selectedIndex, handlers.uncontrolledSelectedIndex, tabs.length);
    const pillJelly = usePillJelly({
        config: appearance.resolvedConfig,
        controlledProgress: props.progress,
        controlledSelectedIndex: props.selectedIndex,
        displayScale: appearance.displayScale,
        onTabChange: handlers.handleTabChange,
        onTabLongPress: handlers.longPressHandler,
        onTabPress: handlers.pressHandler,
        recording: props.recording,
        tabCount: tabs.length,
        touchFeedbackRadius: appearance.touchFeedback.radius,
    });
    const { handleTrackLayout, webTrackWidth } = useWebTrackMeasurement(
        trackRef,
        pillJelly.setTrackWidth,
        pillJelly.setWebTrackPageX,
    );

    return (
        <SelectedTabIndexContext.Provider value={selectedIndex}>
            <TabBarBody
                appearance={appearance}
                backdrop={props.backdrop}
                items={renderedItems}
                maxWidth={props.maxWidth ?? DEFAULT_MAX_WIDTH}
                onLongPress={handlers.longPressHandler}
                onTrackLayout={handleTrackLayout}
                pillJelly={pillJelly}
                pillVisible={selectedIndex !== null}
                selectedBackdrop={props.selectedBackdrop}
                tabs={tabs}
                touchFeedbackEnabled={props.touchFeedbackEnabled ?? true}
                trackRef={trackRef}
                webTrackWidth={webTrackWidth}
            />
        </SelectedTabIndexContext.Provider>
    );
};
