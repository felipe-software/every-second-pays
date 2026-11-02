/* eslint-disable react-hooks/immutability */
import type { TabBarConfig } from "../constants";
import { getInitialSelectedIndex } from "../utils/pill-jelly-selection";
import { useDistortion } from "./use-distortion";
import { usePillJellyControlledSync } from "./use-pill-jelly-controlled-sync";
import { usePillJellyFrameLoop } from "./use-pill-jelly-frame-loop";
import { usePillJellyGesture } from "./use-pill-jelly-gesture";
import { usePillJellySharedValues } from "./use-pill-jelly-shared-values";
import { usePillJellyStyles } from "./use-pill-jelly-styles";
import { usePillJellyTabActions } from "./use-pill-jelly-tab-actions";
import { Platform } from "react-native";
import { useCallback } from "react";
import type { SharedValue } from "react-native-reanimated";

const IS_WEB = Platform.OS === "web";

export interface UsePillJellyOptions {
    tabCount: number;
    config: TabBarConfig;
    recording?: boolean;
    displayScale?: number;
    touchFeedbackRadius?: number;
    controlledSelectedIndex?: number | null;
    controlledProgress?: SharedValue<number>;
    onTabChange?: (index: number) => void;
    onTabPress?: (index: number) => boolean | void;
    onTabLongPress?: (index: number) => void;
}

export const usePillJelly = ({
    tabCount,
    config,
    recording = false,
    displayScale = 1,
    touchFeedbackRadius = 0,
    controlledSelectedIndex,
    controlledProgress,
    onTabChange,
    onTabPress,
    onTabLongPress,
}: UsePillJellyOptions) => {
    const geometryScale = displayScale > 0 ? displayScale : 1;
    const { layout, pillJelly } = config;
    const itemHeight = layout.itemHeight * geometryScale;
    const maskOverscanX = layout.maskOverscanX * geometryScale;
    const maskOverscanY = layout.maskOverscanY * geometryScale;
    const trackInset = layout.trackInset * geometryScale;
    const trackHeight = layout.trackHeight * geometryScale;
    const {
        begin: beginTabbarInteraction,
        end: endTabbarInteraction,
        pressedStyle,
        setTrackWidth: setDistortionTrackWidth,
        tabbarOriginStyle,
        tabbarStyle,
        touchFeedbackStyle,
        update: updateDistortion,
    } = useDistortion(config, geometryScale, touchFeedbackRadius);
    const sharedValues = usePillJellySharedValues(getInitialSelectedIndex(controlledSelectedIndex, tabCount));
    const { trackWidth, webTrackPageX } = sharedValues;
    const setFrameLoopActive = usePillJellyFrameLoop({ controlledProgress, pillJelly, sharedValues, tabCount });

    usePillJellyControlledSync({
        controlledProgress,
        controlledSelectedIndex,
        setFrameLoopActive,
        sharedValues,
        tabCount,
    });

    const { activeItemStyle, clipStyle, contentStyle, maskStyle, panelStyle } = usePillJellyStyles({
        geometryScale,
        itemHeight,
        maskOverscanX,
        maskOverscanY,
        sharedValues,
        tabCount,
        trackHeight,
        trackInset,
    });
    const { activateTab, confirmTabPressOnJS } = usePillJellyTabActions({
        controlledSelectedIndex,
        onTabChange,
        onTabPress,
        setFrameLoopActive,
        sharedValues,
        tabCount,
    });
    const gesture = usePillJellyGesture({
        beginTabbarInteraction,
        confirmTabPressOnJS,
        downX: sharedValues.downX,
        dragStartPanelOffset: sharedValues.dragStartPanelOffset,
        dragStartTarget: sharedValues.dragStartTarget,
        endTabbarInteraction,
        isDragging: sharedValues.isDragging,
        movedDistance: sharedValues.movedDistance,
        onTabLongPress,
        pillJelly,
        pressTarget: sharedValues.pressTarget,
        progressOwnedByTabBar: sharedValues.progressOwnedByTabBar,
        rawPanelOffset: sharedValues.rawPanelOffset,
        rawPanelOffsetVelocity: sharedValues.rawPanelOffsetVelocity,
        recording,
        releasePending: sharedValues.releasePending,
        setFrameLoopActive,
        shapeTarget: sharedValues.shapeTarget,
        tabCount,
        targetValue: sharedValues.targetValue,
        trackHeight,
        trackInset,
        trackWidth,
        updateDistortion,
        webTrackPageX,
    });

    const setTrackWidth = useCallback(
        (width: number) => {
            trackWidth.value = width;
            setDistortionTrackWidth(width);
        },
        [setDistortionTrackWidth, trackWidth],
    );

    const setWebTrackPageX = useCallback(
        (pageX: number) => {
            if (IS_WEB && Number.isFinite(pageX)) {
                webTrackPageX.value = pageX;
            }
        },
        [webTrackPageX],
    );

    return {
        activateTab,
        activeItemStyle,
        gesture,
        panelStyle,
        pillClipStyle: clipStyle,
        pillContentStyle: contentStyle,
        pillMaskStyle: maskStyle,
        pressedStyle,
        setTrackWidth,
        setWebTrackPageX,
        tabbarOriginStyle,
        tabbarStyle,
        touchFeedbackStyle,
    };
};
