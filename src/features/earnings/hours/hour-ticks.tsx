import { Line } from "react-native-svg";

import { ARC_STROKE, type ArcGeometry, arcHours, isMajorHour, pointAt } from "./arc-geometry";

const TICK_INSET = ARC_STROKE / 2 + 3;

export function HourTicks({ geometry, color }: { geometry: ArcGeometry; color: string }) {
    return (
        <>
            {arcHours(geometry).map((minutes) => {
                const major = isMajorHour(minutes);
                const inner = pointAt(geometry, minutes, geometry.radius + TICK_INSET);
                const outer = pointAt(geometry, minutes, geometry.radius + TICK_INSET + (major ? 6 : 3.5));
                return (
                    <Line
                        key={minutes}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke={color}
                        strokeWidth={major ? 1.5 : 1}
                        strokeLinecap="round"
                    />
                );
            })}
        </>
    );
}
