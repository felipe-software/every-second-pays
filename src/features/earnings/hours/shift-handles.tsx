import { createAnimatedComponent, useAnimatedProps } from "react-native-reanimated";
import { Circle } from "react-native-svg";

import { HANDLE_RADIUS, pointAt } from "./arc-geometry";
import { type ShiftMarkProps, useShiftMinutes } from "./use-shift-minutes";

const AnimatedCircle = createAnimatedComponent(Circle);

export function ShiftHandles({
    geometry,
    shift,
    fill,
    stroke,
    instant,
}: ShiftMarkProps & { fill: string; stroke: string }) {
    const { start, end } = useShiftMinutes(shift, instant);
    const startProps = useAnimatedProps(() => {
        const point = pointAt(geometry, start.get());
        return { cx: point.x, cy: point.y };
    });
    const endProps = useAnimatedProps(() => {
        const point = pointAt(geometry, end.get());
        return { cx: point.x, cy: point.y };
    });

    return (
        <>
            {[startProps, endProps].map((animatedProps, index) => (
                <AnimatedCircle
                    key={index}
                    animatedProps={animatedProps}
                    r={HANDLE_RADIUS}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={3}
                />
            ))}
        </>
    );
}
