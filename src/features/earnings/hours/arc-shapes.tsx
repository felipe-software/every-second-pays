import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { mixColors } from "@/features/appearance/color";

import type { Shift } from "../model";
import type { EarningsColors } from "../theme";
import { ARC_STROKE, type ArcGeometry, arcPath } from "./arc-geometry";
import { EndIcon } from "./end-icon";
import { HourTicks } from "./hour-ticks";
import { ShiftArc } from "./shift-arc";
import { ShiftHandles } from "./shift-handles";

const OVERLAP_STROKE = 4;
const ICON_DROP = 25;

export type ArcEnd = { x: number; minutes: number; icon: "sun" | "moon" };

function overlapsOf(shifts: readonly Shift[]) {
    return shifts.flatMap((shift, index) =>
        shifts.slice(index + 1).flatMap((other, offset) => {
            const start = Math.max(shift.start, other.start);
            const end = Math.min(shift.end, other.end);
            return start < end ? [{ key: `${index}-${index + 1 + offset}`, shift: { start, end } }] : [];
        }),
    );
}

export function ArcShapes({
    geometry,
    shifts,
    selected,
    selectedIndex,
    ends,
    dragging,
    accessibilityLabel,
    colors,
    isDark,
}: {
    geometry: ArcGeometry;
    shifts: readonly Shift[];
    selected: Shift;
    selectedIndex: number;
    ends: readonly ArcEnd[];
    dragging: boolean;
    accessibilityLabel: string;
    colors: EarningsColors;
    isDark: boolean;
}) {
    return (
        <View accessible accessibilityLabel={accessibilityLabel} pointerEvents="none">
            {/* Android's SVG view repaints all shapes in software on any change, so static ones get their own. */}
            <Svg width={geometry.width} height={geometry.height}>
                <HourTicks geometry={geometry} color={mixColors(colors.card, colors.muted, 0.7)} />
                <Path
                    d={arcPath(geometry, geometry.first, 1440)}
                    stroke={isDark ? mixColors(colors.card, colors.ink, 0.1) : colors.row}
                    strokeWidth={ARC_STROKE}
                    strokeLinecap="round"
                    fill="none"
                />
                {ends.map((end) => (
                    <EndIcon
                        key={end.minutes}
                        x={end.x}
                        y={geometry.endY + ICON_DROP}
                        kind={end.icon}
                        color={colors.ink}
                    />
                ))}
            </Svg>
            <Svg width={geometry.width} height={geometry.height} style={StyleSheet.absoluteFill}>
                {shifts.map((shift, index) =>
                    index === selectedIndex ? null : (
                        <ShiftArc
                            key={index}
                            geometry={geometry}
                            shift={shift}
                            color={`${colors.accent}73`}
                            instant={false}
                        />
                    ),
                )}
                <ShiftArc
                    key={`selected-${selectedIndex}`}
                    geometry={geometry}
                    shift={selected}
                    color={colors.accent}
                    instant={dragging}
                />
                {overlapsOf(shifts).map((overlap) => (
                    <ShiftArc
                        key={overlap.key}
                        geometry={geometry}
                        shift={overlap.shift}
                        color={colors.accentDeep}
                        strokeWidth={OVERLAP_STROKE}
                        instant={dragging}
                    />
                ))}
                <ShiftHandles
                    key={`handles-${selectedIndex}`}
                    geometry={geometry}
                    shift={selected}
                    fill={isDark ? colors.ink : "#FFFFFF"}
                    stroke={colors.accentDeep}
                    instant={dragging}
                />
            </Svg>
        </View>
    );
}
