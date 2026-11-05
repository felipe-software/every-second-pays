import { memo, type ReactNode, type RefObject } from "react";
import { type DimensionValue, type LayoutChangeEvent, StyleSheet, type View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import type { PillJelly } from "../hooks/use-pill-jelly";
import type { TabBarAppearance } from "../hooks/use-tab-bar-appearance";
import type { TabsItem } from "../types";
import { AccessibilityTabsRow, type TabElements } from "./tab-bar-layers";
import { TabBarVisuals } from "./tab-bar-visuals";

interface TabBarBodyProps {
    appearance: TabBarAppearance;
    backdrop: ReactNode;
    items: readonly TabsItem[];
    maxWidth: DimensionValue;
    onLongPress?: (index: number) => void;
    onTrackLayout: (event: LayoutChangeEvent) => void;
    pillJelly: PillJelly;
    pillVisible: boolean;
    selectedBackdrop: ReactNode;
    tabs: TabElements;
    touchFeedbackEnabled: boolean;
    trackRef: RefObject<View | null>;
    webTrackWidth: number;
}

export const TabBarBody = memo(function TabBarBody({
    appearance,
    backdrop,
    items,
    maxWidth,
    onLongPress,
    onTrackLayout,
    pillJelly,
    pillVisible,
    selectedBackdrop,
    tabs,
    touchFeedbackEnabled,
    trackRef,
    webTrackWidth,
}: TabBarBodyProps) {
    const { trackHeight, trackInset } = appearance.geometry;

    return (
        <GestureDetector gesture={pillJelly.gesture}>
            <Animated.View
                collapsable={false}
                style={[styles.pressWrapper, { height: trackHeight, maxWidth }, pillJelly.pressedStyle]}
            >
                <Animated.View
                    collapsable={false}
                    pointerEvents="box-only"
                    ref={trackRef}
                    testID="tabs-drag-surface"
                    style={[styles.track, { height: trackHeight }, pillJelly.tabbarOriginStyle, pillJelly.tabbarStyle]}
                    onLayout={onTrackLayout}
                >
                    <TabBarVisuals
                        appearance={appearance}
                        backdrop={backdrop}
                        pillJelly={pillJelly}
                        pillVisible={pillVisible}
                        selectedBackdrop={selectedBackdrop}
                        tabs={tabs}
                        touchFeedbackEnabled={touchFeedbackEnabled}
                        webTrackWidth={webTrackWidth}
                    />
                    <AccessibilityTabsRow
                        items={items}
                        onActivate={pillJelly.activateTab}
                        onLongPress={onLongPress}
                        trackInset={trackInset}
                    />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
});

const styles = StyleSheet.create({
    pressWrapper: {
        alignSelf: "center",
        width: "100%",
        userSelect: "none",
    },
    track: {
        position: "relative",
        width: "100%",
        overflow: "visible",
    },
});
