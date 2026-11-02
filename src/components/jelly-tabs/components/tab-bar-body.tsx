import { AccessibilityTabsRow, type AnimatedViewStyle } from "./tab-bar-layers";
import { TabBarPanel, type TabBarPanelProps } from "./tab-bar-panel";
import type { usePillJelly } from "../hooks/use-pill-jelly";
import type { TabsItem } from "../types";
import { memo, type RefObject } from "react";
import { type DimensionValue, type LayoutChangeEvent, StyleSheet, type View, type ViewStyle } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

interface TabBarBodyProps extends TabBarPanelProps {
    gesture: ReturnType<typeof usePillJelly>["gesture"];
    items: readonly TabsItem[];
    maxWidth: DimensionValue;
    onActivate: (index: number) => void;
    onLongPress?: (index: number) => void;
    onTrackLayout: (event: LayoutChangeEvent) => void;
    pressedStyle: AnimatedViewStyle;
    tabbarOriginStyle: ViewStyle;
    tabbarStyle: AnimatedViewStyle;
    trackRef: RefObject<View | null>;
}

// Selection changes re-render only the accessibility row, through SelectedTabIndexContext.
export const TabBarBody = memo(function TabBarBody({
    gesture,
    items,
    maxWidth,
    onActivate,
    onLongPress,
    onTrackLayout,
    pressedStyle,
    tabbarOriginStyle,
    tabbarStyle,
    trackRef,
    ...panelProps
}: TabBarBodyProps) {
    const { geometry } = panelProps;

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                collapsable={false}
                style={[styles.pressWrapper, { height: geometry.trackHeight, maxWidth }, pressedStyle]}
            >
                <Animated.View
                    collapsable={false}
                    pointerEvents="box-only"
                    ref={trackRef}
                    testID="tabs-drag-surface"
                    style={[styles.track, { height: geometry.trackHeight }, tabbarOriginStyle, tabbarStyle]}
                    onLayout={onTrackLayout}
                >
                    <TabBarPanel {...panelProps} />

                    <AccessibilityTabsRow
                        items={items}
                        onActivate={onActivate}
                        onLongPress={onLongPress}
                        trackInset={geometry.trackInset}
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
        // Stop the label/icon glyphs from being text-selected on web; harmless on native.
        userSelect: "none",
    },
    track: {
        position: "relative",
        width: "100%",
        overflow: "visible",
    },
});
