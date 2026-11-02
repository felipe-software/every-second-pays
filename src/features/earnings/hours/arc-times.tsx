import { Platform, Text, View } from "react-native";

import { RAISED_OUTLINE } from "@/components/elevated/raised";
import { useI18n } from "@/features/i18n/i18n";

import type { Shift } from "../model";
import { SystemTimeInput } from "../system-time-input";
import { type ArcGeometry, HANDLE_RADIUS, INLINE_TIME_PADDING, MIN_SHIFT, innerWidthAt } from "./arc-geometry";

const TIMES_HEIGHT = 34;
const CENTER_FONT = { max: 17, min: 11 };
const TIME_PILLS = Platform.OS === "android";
const PILL_CHROME = TIME_PILLS ? 2 * 2 * (INLINE_TIME_PADDING + RAISED_OUTLINE) : 0;
const IOS_PICKER = { max: 104, gap: 6 };
// Archivo Bold averages a little over half an em per character.
const CHARACTER_WIDTH = 0.56;

export function ArcTimes({
    geometry,
    selected,
    selectedIndex,
    startText,
    endText,
    to,
    detail,
    onShiftChange,
}: {
    geometry: ArcGeometry;
    selected: Shift;
    selectedIndex: number;
    startText: string;
    endText: string;
    to: string;
    detail: string;
    onShiftChange: (index: number, shift: Shift) => void;
}) {
    const { t } = useI18n();
    const timesWidth = innerWidthAt(geometry, TIMES_HEIGHT / 2, HANDLE_RADIUS) - 8;
    const centerFont = Math.max(
        CENTER_FONT.min,
        Math.min(
            CENTER_FONT.max,
            Math.floor((timesWidth - PILL_CHROME) / (`${startText}${to}${endText}`.length * CHARACTER_WIDTH)),
        ),
    );
    const pickerWidth = Math.min(IOS_PICKER.max, (timesWidth - IOS_PICKER.gap) / 2);

    return (
        <View
            pointerEvents="box-none"
            className="absolute inset-x-0 items-center gap-1"
            style={{ top: geometry.endY - TIMES_HEIGHT / 2 }}
        >
            <View
                className="flex-row items-center"
                style={{ height: TIMES_HEIGHT, maxWidth: timesWidth, gap: TIME_PILLS ? 0 : IOS_PICKER.gap }}
            >
                <SystemTimeInput
                    variant="inline"
                    label={t("payment.start")}
                    fontSize={centerFont}
                    width={pickerWidth}
                    value={selected.start}
                    onChange={(start) =>
                        onShiftChange(selectedIndex, { ...selected, start: Math.min(selected.end - MIN_SHIFT, start) })
                    }
                />
                {TIME_PILLS ? (
                    // Lifted by the pills' edge so the word lines up with their faces.
                    <Text
                        className="font-sans font-semibold text-muted"
                        style={{ fontSize: centerFont * 0.8, paddingBottom: 2 + RAISED_OUTLINE }}
                    >
                        {to}
                    </Text>
                ) : null}
                <SystemTimeInput
                    variant="inline"
                    label={t("payment.end")}
                    fontSize={centerFont}
                    width={pickerWidth}
                    value={selected.end}
                    onChange={(selectedEnd) => {
                        const end = selectedEnd === 0 ? 1440 : selectedEnd;
                        onShiftChange(selectedIndex, { ...selected, end: Math.max(selected.start + MIN_SHIFT, end) });
                    }}
                />
            </View>
            <Text
                pointerEvents="none"
                className="text-center font-sans text-[11px] font-medium text-muted tabular-nums"
            >
                {detail}
            </Text>
        </View>
    );
}
