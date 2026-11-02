import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { hoursPerDay, type Shift } from "../model";
import { useEarningsTheme } from "../theme";
import { ARC_STROKE, arcGeometry, arcHours, firstArcMinute, isMajorHour, pointAt } from "./arc-geometry";
import { ArcShapes } from "./arc-shapes";
import { ArcTimes } from "./arc-times";
import { useArcResponder } from "./use-arc-responder";

const LABEL_INSET = ARC_STROKE / 2 + 19;
const END_LABEL_DROP = 43;
// The sheet's 24 pt padding plus the card's 16 pt on each side, until the arc is measured.
const HORIZONTAL_INSET = 2 * (24 + 16);

export function DayArc({
    shifts,
    selectedIndex,
    onSelect,
    onShiftChange,
}: {
    shifts: readonly Shift[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onShiftChange: (index: number, shift: Shift) => void;
}) {
    const { colors, isDark } = useEarningsTheme();
    const { t, formatNumber, formatHour, formatTime } = useI18n();
    const window = useWindowDimensions();
    const [width, setWidth] = useState(window.width - HORIZONTAL_INSET);
    // Freezes the span during a drag so the arc can't rescale under the finger.
    const [dragFirst, setDragFirst] = useState<number | null>(null);

    const first = dragFirst ?? firstArcMinute(shifts);
    const geometry = arcGeometry(width, first);
    const dragging = dragFirst != null;
    const selected = shifts[selectedIndex];
    const responder = useArcResponder({
        geometry,
        shifts,
        selected,
        selectedIndex,
        setDragFirst,
        onSelect,
        onShiftChange,
    });

    const hours = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
    const detail =
        shifts.length > 1
            ? t("payment.shiftOfDay", {
                  hours: hours(hoursPerDay({ shifts: [selected] })),
                  total: hours(hoursPerDay({ shifts })),
              })
            : t("payment.hoursPerDay", { hours: hours(hoursPerDay({ shifts })) });
    const to = t("payment.summary.to");
    const [startText, endText] = [formatTime(selected.start), formatTime(selected.end)];

    const firstEnd = pointAt(geometry, geometry.first);
    const lastEnd = pointAt(geometry, 1440);
    const ends = [
        { x: firstEnd.x, minutes: geometry.first, icon: geometry.first >= 360 ? "sun" : "moon" },
        { x: lastEnd.x, minutes: 1440, icon: "moon" },
    ] as const;
    const hourLabels = arcHours(geometry).filter(
        (minutes) => isMajorHour(minutes) && minutes !== geometry.first && minutes !== 1440,
    );

    return (
        <View
            {...responder}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            className="self-stretch"
            style={{ height: geometry.height }}
        >
            <ArcShapes
                geometry={geometry}
                shifts={shifts}
                selected={selected}
                selectedIndex={selectedIndex}
                ends={ends}
                dragging={dragging}
                accessibilityLabel={`${startText}${to}${endText}, ${detail}`}
                colors={colors}
                isDark={isDark}
            />

            {hourLabels.map((minutes) => {
                const point = pointAt(geometry, minutes, geometry.radius + LABEL_INSET);
                return (
                    <Text
                        key={minutes}
                        pointerEvents="none"
                        importantForAccessibility="no"
                        className="absolute w-14 text-center font-sans text-[10.5px] font-medium text-muted tabular-nums"
                        style={{ left: point.x - 28, top: point.y - 7 }}
                    >
                        {formatHour(minutes)}
                    </Text>
                );
            })}
            {ends.map((end) => (
                <Text
                    key={end.minutes}
                    pointerEvents="none"
                    importantForAccessibility="no"
                    className="absolute w-14 text-center font-sans text-[10.5px] font-medium text-muted tabular-nums"
                    style={{ left: end.x - 28, top: geometry.endY + END_LABEL_DROP - 7 }}
                >
                    {formatHour(end.minutes)}
                </Text>
            ))}

            <ArcTimes
                geometry={geometry}
                selected={selected}
                selectedIndex={selectedIndex}
                startText={startText}
                endText={endText}
                to={to}
                detail={detail}
                onShiftChange={onShiftChange}
            />
        </View>
    );
}
