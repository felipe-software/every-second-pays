/* eslint-disable react-hooks/immutability */
import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { type SharedValue, useAnimatedStyle, useDerivedValue } from "react-native-reanimated";

import type { TabBarConfig } from "../constants";
import { getHorizontalPanelOffset } from "../utils/animation";
import { useDistortion } from "./use-distortion";
import { useControlledProgressSync, usePillJellyFrameLoop } from "./use-pill-jelly-frame-loop";
import { usePillJellyGesture } from "./use-pill-jelly-gesture";
import { getControlledSelectedIndex, usePillJellySelection } from "./use-pill-jelly-selection";
import { usePillJellyState } from "./use-pill-jelly-state";
import { usePillShapeStyles } from "./use-pill-shape-styles";

const IS_WEB = Platform.OS === "web";

interface UsePillJellyOptions {
    config: TabBarConfig;
    controlledProgress?: SharedValue<number>;
    controlledSelectedIndex?: number | null;
    displayScale?: number;
    onTabChange?: (index: number) => void;
    onTabLongPress?: (index: number) => void;
    onTabPress?: (index: number) => boolean | void;
    recording?: boolean;
    tabCount: number;
    touchFeedbackRadius?: number;
}

const getInitialSelectedIndex = (controlledSelectedIndex: number | null | undefined, tabCount: number) => {
    if (controlledSelectedIndex !== undefined) {
        return getControlledSelectedIndex(controlledSelectedIndex, tabCount);
    }
    return tabCount > 0 ? 0 : -1;
};

export const usePillJelly = ({
    config,
    controlledProgress,
    controlledSelectedIndex,
    displayScale = 1,
    onTabChange,
    onTabLongPress,
    onTabPress,
    recording = false,
    tabCount,
    touchFeedbackRadius = 0,
}: UsePillJellyOptions) => {
    const geometryScale = displayScale > 0 ? displayScale : 1;
    const { layout, pillJelly } = config;
    const trackInset = layout.trackInset * geometryScale;
    const trackHeight = layout.trackHeight * geometryScale;
    const distortionHooks = useDistortion(config, geometryScale, touchFeedbackRadius);
    const { begin, end, setTrackWidth: setDistortionTrackWidth, update } = distortionHooks;
    const state = usePillJellyState(getInitialSelectedIndex(controlledSelectedIndex, tabCount));
    const setFrameLoopActive = usePillJellyFrameLoop(state, pillJelly.frameConfig, tabCount, controlledProgress);
    const { activateTab, confirmTabPressOnJS } = usePillJellySelection({
        controlledSelectedIndex,
        onTabChange,
        onTabPress,
        setFrameLoopActive,
        state,
        tabCount,
    });

    useControlledProgressSync(state, tabCount, controlledProgress);

    const panelOffset = useDerivedValue(() =>
        getHorizontalPanelOffset(state.rawPanelOffset.value, state.trackWidth.value, geometryScale),
    );
    const panelStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: panelOffset.value }],
    }));
    const { clipStyle, contentStyle, maskStyle } = usePillShapeStyles({
        baseScaleX: state.baseScaleX,
        baseScaleY: state.baseScaleY,
        filteredVelocity: state.filteredVelocity,
        itemHeight: layout.itemHeight * geometryScale,
        maskOverscanX: layout.maskOverscanX * geometryScale,
        maskOverscanY: layout.maskOverscanY * geometryScale,
        tabCount,
        trackHeight,
        trackInset,
        trackWidth: state.trackWidth,
        value: state.value,
    });
    const activeItemStyle = useAnimatedStyle(() => {
        const scale = 1 + 0.2 * state.pressProgress.value;
        return { transform: [{ scaleX: scale }, { scaleY: scale }] };
    });

    const distortion = useMemo(() => ({ begin, end, update }), [begin, end, update]);
    const gesture = usePillJellyGesture({
        confirmTabPressOnJS,
        distortion,
        onTabLongPress,
        pillJelly,
        recording,
        setFrameLoopActive,
        state,
        tabCount,
        trackHeight,
        trackInset,
    });

    const setTrackWidth = useCallback(
        (width: number) => {
            state.trackWidth.value = width;
            setDistortionTrackWidth(width);
        },
        [setDistortionTrackWidth, state],
    );
    const setWebTrackPageX = useCallback(
        (pageX: number) => {
            if (IS_WEB && Number.isFinite(pageX)) {
                state.webTrackPageX.value = pageX;
            }
        },
        [state],
    );

    const { pressedStyle, tabbarOriginStyle, tabbarStyle, touchFeedbackStyle } = distortionHooks;

    return useMemo(
        () => ({
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
        }),
        [
            activateTab,
            activeItemStyle,
            clipStyle,
            contentStyle,
            gesture,
            maskStyle,
            panelStyle,
            pressedStyle,
            setTrackWidth,
            setWebTrackPageX,
            tabbarOriginStyle,
            tabbarStyle,
            touchFeedbackStyle,
        ],
    );
};

export type PillJelly = ReturnType<typeof usePillJelly>;
