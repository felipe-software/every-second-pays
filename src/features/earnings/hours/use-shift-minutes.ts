import { useEffect } from "react";
import { Easing, ReduceMotion, useSharedValue, withTiming } from "react-native-reanimated";

import type { Shift } from "../model";
import type { ArcGeometry } from "./arc-geometry";

const MORPH = { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

export type ShiftMarkProps = { geometry: ArcGeometry; shift: Shift; instant: boolean };

export function useShiftMinutes(shift: Shift, instant: boolean) {
    const start = useSharedValue(shift.start);
    const end = useSharedValue(shift.end);

    useEffect(() => {
        start.set(instant ? shift.start : withTiming(shift.start, MORPH));
        end.set(instant ? shift.end : withTiming(shift.end, MORPH));
    }, [end, instant, shift.end, shift.start, start]);

    return { start, end };
}
