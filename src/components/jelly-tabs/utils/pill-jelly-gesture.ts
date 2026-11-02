import type { PillJellyConfig } from "../constants";
import { getMaxTabIndex, getTabWidth } from "./animation";
import { Gesture, type TouchData } from "react-native-gesture-handler";
import { Platform } from "react-native";
import { clamp, runOnJS, type SharedValue } from "react-native-reanimated";

const IS_WEB = Platform.OS === "web";

export interface PillJellyGestureInputs {
    beginTabbarInteraction: (localX: number, localY: number, absoluteX: number) => void;
    confirmTabPressOnJS: (index: number) => void;
    downX: SharedValue<number>;
    dragStartPanelOffset: SharedValue<number>;
    dragStartTarget: SharedValue<number>;
    endTabbarInteraction: () => void;
    isDragging: SharedValue<number>;
    movedDistance: SharedValue<number>;
    onTabLongPress?: (index: number) => void;
    pillJelly: PillJellyConfig;
    pressTarget: SharedValue<number>;
    progressOwnedByTabBar: SharedValue<number>;
    rawPanelOffset: SharedValue<number>;
    rawPanelOffsetVelocity: SharedValue<number>;
    recording: boolean;
    releasePending: SharedValue<number>;
    setFrameLoopActive: (active: boolean) => void;
    shapeTarget: SharedValue<number>;
    tabCount: number;
    targetValue: SharedValue<number>;
    trackHeight: number;
    trackInset: number;
    trackWidth: SharedValue<number>;
    updateDistortion: (verticalTranslation: number, absoluteX: number, localX?: number | null) => void;
    webTrackPageX: SharedValue<number>;
}

const getTouchLocalX = (touch: TouchData, recording: boolean, webTrackPageX: SharedValue<number>) => {
    "worklet";

    if (recording) {
        return touch.y;
    }

    // RNGH Web can report x relative to its display: contents wrapper, so use the measured track.
    if (IS_WEB && Number.isFinite(webTrackPageX.value)) {
        return touch.absoluteX - webTrackPageX.value;
    }

    return touch.x;
};

const createFinishGesture = ({
    confirmTabPressOnJS,
    downX,
    endTabbarInteraction,
    isDragging,
    movedDistance,
    rawPanelOffsetVelocity,
    releasePending,
    tabCount,
    targetValue,
    trackInset,
    trackWidth,
}: PillJellyGestureInputs) => {
    const finishGesture = () => {
        "worklet";

        isDragging.value = 0;
        rawPanelOffsetVelocity.value = 0;
        endTabbarInteraction();

        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        let nextIndex: number;

        if (movedDistance.value < 4 && tabWidth > 0) {
            // A stationary gesture is a click; a moving one stays relative so the whole bar is a handle.
            nextIndex = Math.floor((downX.value - trackInset) / tabWidth);
        } else {
            nextIndex = Math.round(targetValue.value);
        }

        nextIndex = clamp(nextIndex, 0, getMaxTabIndex(tabCount));
        targetValue.value = nextIndex;
        releasePending.value = 1;

        if (tabCount > 0) {
            runOnJS(confirmTabPressOnJS)(nextIndex);
        }
    };

    return finishGesture;
};

const createBeginGesture = ({
    beginTabbarInteraction,
    downX,
    dragStartPanelOffset,
    dragStartTarget,
    isDragging,
    movedDistance,
    pillJelly,
    pressTarget,
    progressOwnedByTabBar,
    rawPanelOffset,
    rawPanelOffsetVelocity,
    releasePending,
    shapeTarget,
    tabCount,
    targetValue,
    trackInset,
    trackWidth,
}: PillJellyGestureInputs) => {
    const beginGesture = (localX: number, localY: number, absoluteX: number) => {
        "worklet";

        beginTabbarInteraction(localX, localY, absoluteX);
        progressOwnedByTabBar.value = 1;
        downX.value = localX;
        movedDistance.value = 0;

        const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
        if (pillJelly.snapOnPointerDown && tabWidth > 0) {
            targetValue.value = clamp(Math.floor((localX - trackInset) / tabWidth), 0, getMaxTabIndex(tabCount));
        }

        dragStartTarget.value = targetValue.value;
        dragStartPanelOffset.value = rawPanelOffset.value;
        isDragging.value = 1;
        releasePending.value = 0;
        pressTarget.value = 1;
        shapeTarget.value = pillJelly.pressedScale;
        rawPanelOffsetVelocity.value = 0;
    };

    return beginGesture;
};

const createPanGesture = (inputs: PillJellyGestureInputs) => {
    const {
        downX,
        dragStartPanelOffset,
        dragStartTarget,
        movedDistance,
        rawPanelOffset,
        recording,
        setFrameLoopActive,
        tabCount,
        targetValue,
        trackHeight,
        trackInset,
        trackWidth,
        updateDistortion,
        webTrackPageX,
    } = inputs;
    const finishGesture = createFinishGesture(inputs);
    const beginGesture = createBeginGesture(inputs);

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

            const localX = getTouchLocalX(firstTouch, recording, webTrackPageX);
            const localY = recording ? trackHeight / 2 : firstTouch.y;
            const absoluteX = recording ? firstTouch.absoluteY : firstTouch.absoluteX;

            beginGesture(localX, localY, absoluteX);
        })
        .onUpdate((event) => {
            const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
            if (tabWidth <= 0) {
                return;
            }

            const horizontalTranslation = recording ? event.translationY : event.translationX;
            const verticalTranslation = recording ? -event.translationX : event.translationY;

            targetValue.value = clamp(
                dragStartTarget.value + horizontalTranslation / tabWidth,
                0,
                getMaxTabIndex(tabCount),
            );
            const absoluteX = recording ? event.absoluteY : event.absoluteX;

            rawPanelOffset.value = dragStartPanelOffset.value + horizontalTranslation;
            updateDistortion(verticalTranslation, absoluteX, IS_WEB ? downX.value + horizontalTranslation : null);
            movedDistance.value = Math.max(
                movedDistance.value,
                Math.abs(horizontalTranslation),
                Math.abs(verticalTranslation),
            );
        })
        .onFinalize(() => {
            finishGesture();
            runOnJS(setFrameLoopActive)(false);
        });
};

const createLongPressGesture = ({
    onTabLongPress,
    recording,
    tabCount,
    trackInset,
    trackWidth,
}: PillJellyGestureInputs) =>
    // oxlint-disable-next-line react/capitalized-calls
    Gesture.LongPress()
        .enabled(tabCount > 0 && Boolean(onTabLongPress))
        .minDuration(500)
        .maxDistance(10)
        .onStart((event) => {
            if (!onTabLongPress) {
                return;
            }

            const tabWidth = getTabWidth(trackWidth.value, trackInset, tabCount);
            if (tabWidth <= 0) {
                return;
            }

            const localX = recording ? event.y : event.x;
            const index = clamp(Math.floor((localX - trackInset) / tabWidth), 0, getMaxTabIndex(tabCount));
            runOnJS(onTabLongPress)(index);
        });

export const createPillJellyGesture = (inputs: PillJellyGestureInputs) => {
    const panGesture = createPanGesture(inputs);
    const longPressGesture = createLongPressGesture(inputs);

    // oxlint-disable-next-line react/capitalized-calls
    return inputs.onTabLongPress ? Gesture.Simultaneous(panGesture, longPressGesture) : panGesture;
};
