import { useMemo } from "react";
import { Platform } from "react-native";
import { Gesture, type GestureTouchEvent } from "react-native-gesture-handler";
import { clamp, runOnJS } from "react-native-reanimated";

import type { PillJellyConfig } from "../constants";
import { getMaxTabIndex, getTabWidth } from "../utils/animation";
import type { PillJellyState } from "./use-pill-jelly-state";

const IS_WEB = Platform.OS === "web";

interface DistortionHandlers {
    begin: (localX: number, localY: number, absoluteX: number) => void;
    end: () => void;
    update: (verticalTranslation: number, absoluteX: number, localX?: number | null) => void;
}

interface PillJellyGestureOptions {
    confirmTabPressOnJS: (index: number) => void;
    distortion: DistortionHandlers;
    onTabLongPress?: (index: number) => void;
    pillJelly: PillJellyConfig;
    recording: boolean;
    setFrameLoopActive: (active: boolean) => void;
    state: PillJellyState;
    tabCount: number;
    trackHeight: number;
    trackInset: number;
}

type TouchPoint = GestureTouchEvent["allTouches"][number];

const getTouchLocalX = (touch: TouchPoint, options: PillJellyGestureOptions) => {
    "worklet";

    if (options.recording) {
        return touch.y;
    }
    const trackPageX = options.state.webTrackPageX.value;
    if (IS_WEB && Number.isFinite(trackPageX)) {
        return touch.absoluteX - trackPageX;
    }
    return touch.x;
};

const createPanGesture = (options: PillJellyGestureOptions) => {
    const { confirmTabPressOnJS, distortion, pillJelly, recording, setFrameLoopActive, state, tabCount } = options;
    const { trackHeight, trackInset } = options;

    const finishGesture = () => {
        "worklet";

        state.isDragging.value = 0;
        state.rawPanelOffsetVelocity.value = 0;
        distortion.end();

        const tabWidth = getTabWidth(state.trackWidth.value, trackInset, tabCount);
        const isTap = state.movedDistance.value < 4 && tabWidth > 0;
        const releasedIndex = isTap
            ? Math.floor((state.downX.value - trackInset) / tabWidth)
            : Math.round(state.targetValue.value);
        const nextIndex = clamp(releasedIndex, 0, getMaxTabIndex(tabCount));
        state.targetValue.value = nextIndex;
        state.releasePending.value = 1;

        if (tabCount > 0) {
            runOnJS(confirmTabPressOnJS)(nextIndex);
        }
    };

    const beginGesture = (localX: number, localY: number, absoluteX: number) => {
        "worklet";

        distortion.begin(localX, localY, absoluteX);
        state.progressOwnedByTabBar.value = 1;
        state.downX.value = localX;
        state.movedDistance.value = 0;

        const tabWidth = getTabWidth(state.trackWidth.value, trackInset, tabCount);
        if (pillJelly.snapOnPointerDown && tabWidth > 0) {
            state.targetValue.value = clamp(Math.floor((localX - trackInset) / tabWidth), 0, getMaxTabIndex(tabCount));
        }

        state.dragStartTarget.value = state.targetValue.value;
        state.dragStartPanelOffset.value = state.rawPanelOffset.value;
        state.isDragging.value = 1;
        state.releasePending.value = 0;
        state.pressTarget.value = 1;
        state.shapeTarget.value = pillJelly.pressedScale;
        state.rawPanelOffsetVelocity.value = 0;
    };

    // oxlint-disable-next-line react/capitalized-calls
    return Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin(() => runOnJS(setFrameLoopActive)(true))
        .onTouchesDown((event) => {
            const firstTouch = event.changedTouches[0] ?? event.allTouches[0];
            if (!firstTouch) {
                return;
            }

            const localY = recording ? trackHeight / 2 : firstTouch.y;
            const absoluteX = recording ? firstTouch.absoluteY : firstTouch.absoluteX;
            beginGesture(getTouchLocalX(firstTouch, options), localY, absoluteX);
        })
        .onUpdate((event) => {
            const tabWidth = getTabWidth(state.trackWidth.value, trackInset, tabCount);
            if (tabWidth <= 0) {
                return;
            }

            const horizontalTranslation = recording ? event.translationY : event.translationX;
            const verticalTranslation = recording ? -event.translationX : event.translationY;

            state.targetValue.value = clamp(
                state.dragStartTarget.value + horizontalTranslation / tabWidth,
                0,
                getMaxTabIndex(tabCount),
            );
            const absoluteX = recording ? event.absoluteY : event.absoluteX;

            state.rawPanelOffset.value = state.dragStartPanelOffset.value + horizontalTranslation;
            distortion.update(
                verticalTranslation,
                absoluteX,
                IS_WEB ? state.downX.value + horizontalTranslation : null,
            );
            state.movedDistance.value = Math.max(
                state.movedDistance.value,
                Math.abs(horizontalTranslation),
                Math.abs(verticalTranslation),
            );
        })
        .onFinalize(() => {
            finishGesture();
            runOnJS(setFrameLoopActive)(false);
        });
};

const createLongPressGesture = (options: PillJellyGestureOptions, onTabLongPress: (index: number) => void) => {
    const { recording, state, tabCount, trackInset } = options;

    // oxlint-disable-next-line react/capitalized-calls
    return Gesture.LongPress()
        .enabled(tabCount > 0)
        .minDuration(500)
        .maxDistance(10)
        .onStart((event) => {
            const tabWidth = getTabWidth(state.trackWidth.value, trackInset, tabCount);
            if (tabWidth <= 0) {
                return;
            }

            const localX = recording ? event.y : event.x;
            const index = clamp(Math.floor((localX - trackInset) / tabWidth), 0, getMaxTabIndex(tabCount));
            runOnJS(onTabLongPress)(index);
        });
};

export const usePillJellyGesture = ({
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
}: PillJellyGestureOptions) =>
    useMemo(() => {
        const options = {
            confirmTabPressOnJS,
            distortion,
            pillJelly,
            recording,
            setFrameLoopActive,
            state,
            tabCount,
            trackHeight,
            trackInset,
        };
        const panGesture = createPanGesture(options);
        if (!onTabLongPress) {
            return panGesture;
        }

        // oxlint-disable-next-line react/capitalized-calls
        return Gesture.Simultaneous(panGesture, createLongPressGesture(options, onTabLongPress));
    }, [
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
    ]);
