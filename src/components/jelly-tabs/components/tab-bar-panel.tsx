import {
    type AnimatedViewStyle,
    InactiveTabsRow,
    PillLayer,
    SurfaceLayer,
    type TabBarGeometry,
    type TabElements,
    TouchFeedbackLayer,
    type TouchFeedbackVisuals,
} from "./tab-bar-layers";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

export interface TabBarPanelProps {
    activeItemStyle: AnimatedViewStyle;
    backdrop: ReactNode;
    geometry: TabBarGeometry;
    panelStyle: AnimatedViewStyle;
    pillClipStyle?: AnimatedViewStyle;
    pillContentStyle?: AnimatedViewStyle;
    pillMaskStyle?: AnimatedViewStyle;
    pillVisible: boolean;
    selectedBackdrop: ReactNode;
    selectedSurfaceColor: string;
    selectedSurfaceOpacity: number;
    surfaceColor: string;
    surfaceOpacity: number;
    tabCount: number;
    tabs: TabElements;
    touchFeedback?: TouchFeedbackVisuals;
    touchFeedbackStyle: AnimatedViewStyle;
    webTrackWidth: number;
}

export const TabBarPanel = ({
    activeItemStyle,
    backdrop,
    geometry,
    panelStyle,
    pillClipStyle,
    pillContentStyle,
    pillMaskStyle,
    pillVisible,
    selectedBackdrop,
    selectedSurfaceColor,
    selectedSurfaceOpacity,
    surfaceColor,
    surfaceOpacity,
    tabCount,
    tabs,
    touchFeedback,
    touchFeedbackStyle,
    webTrackWidth,
}: TabBarPanelProps) => (
    <Animated.View
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, panelStyle]}
    >
        <SurfaceLayer
            backdrop={backdrop}
            color={surfaceColor}
            opacity={surfaceOpacity}
            radius={geometry.trackHeight / 2}
        />

        {touchFeedback && (
            <TouchFeedbackLayer
                animatedStyle={touchFeedbackStyle}
                radius={geometry.trackHeight / 2}
                visuals={touchFeedback}
            />
        )}

        <InactiveTabsRow tabs={tabs} trackInset={geometry.trackInset} />

        <PillLayer
            activeItemStyle={activeItemStyle}
            clipStyle={pillClipStyle}
            contentStyle={pillContentStyle}
            geometry={geometry}
            maskStyle={pillMaskStyle}
            selectedBackdrop={selectedBackdrop}
            selectedSurfaceColor={selectedSurfaceColor}
            selectedSurfaceOpacity={selectedSurfaceOpacity}
            tabCount={tabCount}
            tabs={tabs}
            touchFeedback={touchFeedback}
            touchFeedbackStyle={touchFeedbackStyle}
            visible={pillVisible}
            webTrackWidth={webTrackWidth}
        />
    </Animated.View>
);
