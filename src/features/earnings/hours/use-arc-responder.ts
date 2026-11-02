import { useRef } from "react";
import type { GestureResponderEvent } from "react-native";

import { appHaptics } from "@/features/haptics/haptics";

import type { Shift } from "../model";
import { type ArcGeometry, MIN_SHIFT, isOnArc, minutesAt, pointAt } from "./arc-geometry";

const HANDLE_HIT_RADIUS = 30;

type Edge = "start" | "end";
type Point = { x: number; y: number };
type TouchState = {
    drag: { edge: Edge; index: number; shift: Shift } | null;
    tappedIndex: number;
    // Page-to-arc offset: moves only report page coordinates reliably.
    origin: Point;
};

const IDLE_TOUCH: TouchState = { drag: null, tappedIndex: -1, origin: { x: 0, y: 0 } };

function handleAt(geometry: ArcGeometry, shift: Shift, x: number, y: number): Edge | null {
    const [start, end] = (["start", "end"] as const).map((edge) => {
        const point = pointAt(geometry, shift[edge]);
        return { edge, distance: Math.hypot(point.x - x, point.y - y) };
    });
    const nearest = start.distance <= end.distance ? start : end;
    return nearest.distance <= HANDLE_HIT_RADIUS ? nearest.edge : null;
}

function dragShift(geometry: ArcGeometry, shift: Shift, edge: Edge, { x, y }: Point): Shift | null {
    const minutes = minutesAt(geometry, x, y);
    const next =
        edge === "start"
            ? { ...shift, start: Math.min(minutes, shift.end - MIN_SHIFT) }
            : { ...shift, end: Math.max(minutes, shift.start + MIN_SHIFT) };
    return next.start === shift.start && next.end === shift.end ? null : next;
}

function otherShiftAt(geometry: ArcGeometry, shifts: readonly Shift[], selectedIndex: number, { x, y }: Point) {
    if (!isOnArc(geometry, x, y)) return -1;
    const minutes = minutesAt(geometry, x, y);
    return shifts.findIndex(
        (shift, index) => index !== selectedIndex && minutes >= shift.start && minutes <= shift.end,
    );
}

type ArcResponderOptions = {
    geometry: ArcGeometry;
    shifts: readonly Shift[];
    selected: Shift;
    selectedIndex: number;
    setDragFirst: (first: number | null) => void;
    onSelect: (index: number) => void;
    onShiftChange: (index: number, shift: Shift) => void;
};

export function useArcResponder({
    geometry,
    shifts,
    selected,
    selectedIndex,
    setDragFirst,
    onSelect,
    onShiftChange,
}: ArcResponderOptions) {
    const touch = useRef<TouchState>(IDLE_TOUCH);

    const finishTouch = () => {
        touch.current = IDLE_TOUCH;
        setDragFirst(null);
    };

    // JS responder, not RNGH: becoming the responder stops Android's sheet and scroll stealing the drag.
    return {
        onStartShouldSetResponder: (event: GestureResponderEvent) => {
            const { locationX: x, locationY: y, pageX, pageY } = event.nativeEvent;
            const edge = handleAt(geometry, selected, x, y);
            const tappedIndex = edge ? -1 : otherShiftAt(geometry, shifts, selectedIndex, { x, y });
            if (!edge && tappedIndex < 0) return false;
            touch.current = {
                drag: edge ? { edge, index: selectedIndex, shift: selected } : null,
                tappedIndex,
                origin: { x: x - pageX, y: y - pageY },
            };
            if (edge) setDragFirst(geometry.first);
            return true;
        },
        // Returning true blocks native parents (sheet drag, its scroll view) from taking over on Android.
        onResponderGrant: () => true,
        onResponderTerminationRequest: () => false,
        onResponderMove: (event: GestureResponderEvent) => {
            const { drag, origin } = touch.current;
            if (!drag) return;
            const { pageX, pageY } = event.nativeEvent;
            const next = dragShift(geometry, drag.shift, drag.edge, { x: origin.x + pageX, y: origin.y + pageY });
            if (!next) return;
            touch.current = { ...touch.current, drag: { ...drag, shift: next } };
            appHaptics.selection();
            onShiftChange(drag.index, next);
        },
        onResponderRelease: () => {
            const { tappedIndex } = touch.current;
            if (tappedIndex >= 0) {
                appHaptics.selection();
                onSelect(tappedIndex);
            }
            finishTouch();
        },
        onResponderTerminate: finishTouch,
    };
}
