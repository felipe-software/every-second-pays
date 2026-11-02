import { createAnimatedComponent, useAnimatedProps } from "react-native-reanimated";
import { Path } from "react-native-svg";

import { ARC_STROKE, arcPath } from "./arc-geometry";
import { type ShiftMarkProps, useShiftMinutes } from "./use-shift-minutes";

const AnimatedPath = createAnimatedComponent(Path);

export function ShiftArc({
    geometry,
    shift,
    color,
    instant,
    strokeWidth = ARC_STROKE,
}: ShiftMarkProps & { color: string; strokeWidth?: number }) {
    const { start, end } = useShiftMinutes(shift, instant);
    const animatedProps = useAnimatedProps(() => ({ d: arcPath(geometry, start.get(), end.get()) }));

    return (
        <AnimatedPath
            animatedProps={animatedProps}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
        />
    );
}
