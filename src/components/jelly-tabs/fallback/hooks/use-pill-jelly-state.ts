import { useState } from "react";
import { makeMutable } from "react-native-reanimated";

const createPillJellyState = (initialSelectedIndex: number) => {
    const initialPillPosition = Math.max(initialSelectedIndex, 0);

    return {
        baseScaleX: makeMutable(1),
        baseScaleXRate: makeMutable(0),
        baseScaleY: makeMutable(1),
        baseScaleYRate: makeMutable(0),
        downX: makeMutable(0),
        dragStartPanelOffset: makeMutable(0),
        dragStartTarget: makeMutable(0),
        filteredVelocity: makeMutable(0),
        filteredVelocityRate: makeMutable(0),
        isDragging: makeMutable(0),
        movedDistance: makeMutable(0),
        pressProgress: makeMutable(0),
        pressProgressRate: makeMutable(0),
        pressTarget: makeMutable(0),
        progressOwnedByTabBar: makeMutable(0),
        rawPanelOffset: makeMutable(0),
        rawPanelOffsetVelocity: makeMutable(0),
        releasePending: makeMutable(0),
        selectedIndex: makeMutable(initialSelectedIndex),
        shapeTarget: makeMutable(1),
        targetValue: makeMutable(initialPillPosition),
        trackWidth: makeMutable(0),
        value: makeMutable(initialPillPosition),
        valueVelocity: makeMutable(0),
        webTrackPageX: makeMutable(Number.NaN),
    };
};

export const usePillJellyState = (initialSelectedIndex: number) => {
    const [state] = useState(() => createPillJellyState(initialSelectedIndex));
    return state;
};

export type PillJellyState = ReturnType<typeof createPillJellyState>;
