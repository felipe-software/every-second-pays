import { useEffect, useRef, useState } from "react";
import { type GestureResponderEvent, Platform, Text, useWindowDimensions, View } from "react-native";
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { RAISED_OUTLINE } from "@/components/elevated/raised";
import { mixColors } from "@/features/appearance/color";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { hoursPerDay, type Shift } from "../model";
import { SystemTimeInput } from "../system-time-input";
import { useEarningsTheme } from "../theme";
import {
    ARC_STROKE,
    type ArcGeometry,
    INLINE_TIME_PADDING,
    MIN_SHIFT,
    arcGeometry,
    arcHours,
    arcPath,
    firstArcMinute,
    innerWidthAt,
    isMajorHour,
    isOnArc,
    minutesAt,
    pointAt,
} from "./arc-geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HANDLE_RADIUS = 11;
const OVERLAP_STROKE = 4;
const HANDLE_HIT_RADIUS = 30;
const TICK_INSET = ARC_STROKE / 2 + 3;
const LABEL_INSET = ARC_STROKE / 2 + 19;
const ICON_SIZE = 16;
/** How far under each end of the arc its icon and its label sit. */
const ICON_DROP = 25;
const END_LABEL_DROP = 43;
const TIMES_HEIGHT = 34;
const CENTER_FONT = { max: 17, min: 11 };
// On Android both times are raised pills: their padding and outline take room from the text.
const TIME_PILLS = Platform.OS === "android";
const PILL_CHROME = TIME_PILLS ? 2 * 2 * (INLINE_TIME_PADDING + RAISED_OUTLINE) : 0;
const IOS_PICKER = { max: 104, gap: 6 };
// Archivo Bold averages a little over half an em per character.
const CHARACTER_WIDTH = 0.56;
// The sheet's 24 pt padding plus the card's 16 pt on each side, until the arc is measured.
const HORIZONTAL_INSET = 2 * (24 + 16);
const MORPH = { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

type Edge = "start" | "end";
type TouchState = {
    drag: { edge: Edge; index: number; shift: Shift } | null;
    tappedIndex: number;
    /** Offset from page to arc coordinates; moves only report page coordinates reliably. */
    origin: { x: number; y: number };
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

/** Moves one end of a shift to the touch, never letting it cross the other end. */
function dragShift(geometry: ArcGeometry, shift: Shift, edge: Edge, x: number, y: number): Shift | null {
    const minutes = minutesAt(geometry, x, y);
    const next = edge === "start"
        ? { ...shift, start: Math.min(minutes, shift.end - MIN_SHIFT) }
        : { ...shift, end: Math.max(minutes, shift.start + MIN_SHIFT) };
    return next.start === shift.start && next.end === shift.end ? null : next;
}

/** The shift under a touch. Shifts may overlap, so one under the selected shift wins over it. */
function otherShiftAt(geometry: ArcGeometry, shifts: readonly Shift[], selectedIndex: number, x: number, y: number) {
    if (!isOnArc(geometry, x, y)) return -1;
    const minutes = minutesAt(geometry, x, y);
    return shifts.findIndex((shift, index) =>
        index !== selectedIndex && minutes >= shift.start && minutes <= shift.end,
    );
}

/** Where shifts overlap: the time two of them share, and the shifts sharing it. */
function overlapsOf(shifts: readonly Shift[]) {
    return shifts.flatMap((shift, index) =>
        shifts.slice(index + 1).flatMap((other, offset) => {
            const start = Math.max(shift.start, other.start);
            const end = Math.min(shift.end, other.end);
            return start < end ? [{ key: `${index}-${index + 1 + offset}`, shift: { start, end } }] : [];
        }),
    );
}

/** Follows a shift's minutes, morphing between presets but tracking a dragged handle 1:1. */
function useShiftMinutes(shift: Shift, instant: boolean) {
    const start = useSharedValue(shift.start);
    const end = useSharedValue(shift.end);

    useEffect(() => {
        start.set(instant ? shift.start : withTiming(shift.start, MORPH));
        end.set(instant ? shift.end : withTiming(shift.end, MORPH));
    }, [end, instant, shift.end, shift.start, start]);

    return { start, end };
}

type ShiftMarkProps = { geometry: ArcGeometry; shift: Shift; instant: boolean };

function ShiftArc({
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

function ShiftHandles({ geometry, shift, fill, stroke, instant }: ShiftMarkProps & { fill: string; stroke: string }) {
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

function HourTicks({ geometry, color }: { geometry: ArcGeometry; color: string }) {
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

/** A 16 pt icon drawn on a 24-unit grid, centered on a point. */
function EndIcon({ x, y, kind, color }: { x: number; y: number; kind: "sun" | "moon"; color: string }) {
    return (
        <G transform={`translate(${x - ICON_SIZE / 2} ${y - ICON_SIZE / 2}) scale(${ICON_SIZE / 24})`}>
            {kind === "sun" ? (
                <>
                    <Circle cx={12} cy={12} r={4.5} fill={color} />
                    <Path
                        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                    />
                </>
            ) : (
                <Path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" fill={color} />
            )}
        </G>
    );
}

/**
 * A low arc from the morning to midnight, the afternoon at its peak, showing every shift
 * of the day. The selected shift has handles to drag its start and end; tapping another
 * shift's stretch selects it, and the times under the peak open the platform time picker.
 */
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
    // While a handle is dragged the arc keeps the span it started with, so it can't rescale
    // under the finger when the earliest shift moves.
    const [dragFirst, setDragFirst] = useState<number | null>(null);
    // A drag spans many renders, so its state lives in a ref.
    const touch = useRef<TouchState>(IDLE_TOUCH);

    const geometry = arcGeometry(width, dragFirst ?? firstArcMinute(shifts));
    const dragging = dragFirst != null;
    const selected = shifts[selectedIndex];

    const hours = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
    const detail = shifts.length > 1
        ? t("payment.shiftOfDay", { hours: hours(hoursPerDay({ shifts: [selected] })), total: hours(hoursPerDay({ shifts })) })
        : t("payment.hoursPerDay", { hours: hours(hoursPerDay({ shifts })) });
    const to = t("payment.summary.to");
    const [startText, endText] = [formatTime(selected.start), formatTime(selected.end)];
    const timesWidth = innerWidthAt(geometry, TIMES_HEIGHT / 2, HANDLE_RADIUS) - 8;
    const centerFont = Math.max(
        CENTER_FONT.min,
        Math.min(CENTER_FONT.max, Math.floor((timesWidth - PILL_CHROME) / (`${startText}${to}${endText}`.length * CHARACTER_WIDTH))),
    );
    const pickerWidth = Math.min(IOS_PICKER.max, (timesWidth - IOS_PICKER.gap) / 2);

    const firstEnd = pointAt(geometry, geometry.first);
    const lastEnd = pointAt(geometry, 1440);
    const ends = [
        { x: firstEnd.x, minutes: geometry.first, icon: geometry.first >= 360 ? "sun" : "moon" },
        { x: lastEnd.x, minutes: 1440, icon: "moon" },
    ] as const;
    const hourLabels = arcHours(geometry).filter((minutes) =>
        isMajorHour(minutes) && minutes !== geometry.first && minutes !== 1440,
    );

    const finishTouch = () => {
        touch.current = IDLE_TOUCH;
        setDragFirst(null);
    };

    // The arc uses the JS responder system rather than a gesture handler: becoming the
    // responder makes Android stop the sheet and its scroll view from stealing the drag.
    // It only claims touches that start on a handle or on another shift's stretch, so the
    // sheet still scrolls and the time buttons under the peak keep their own taps.
    const responder = {
        onStartShouldSetResponder: (event: GestureResponderEvent) => {
            const { locationX: x, locationY: y, pageX, pageY } = event.nativeEvent;
            const edge = handleAt(geometry, selected, x, y);
            const tappedIndex = edge ? -1 : otherShiftAt(geometry, shifts, selectedIndex, x, y);
            if (!edge && tappedIndex < 0) return false;
            touch.current = {
                drag: edge ? { edge, index: selectedIndex, shift: selected } : null,
                tappedIndex,
                origin: { x: x - pageX, y: y - pageY },
            };
            if (edge) setDragFirst(geometry.first);
            return true;
        },
        // Returning true from the grant blocks native parents (the sheet's drag, its
        // scroll view) from taking the touch over on Android.
        onResponderGrant: () => true,
        onResponderTerminationRequest: () => false,
        onResponderMove: (event: GestureResponderEvent) => {
            const { drag, origin } = touch.current;
            if (!drag) return;
            const { pageX, pageY } = event.nativeEvent;
            const next = dragShift(geometry, drag.shift, drag.edge, origin.x + pageX, origin.y + pageY);
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

    return (
        <View
            {...responder}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            className="self-stretch"
            style={{ height: geometry.height }}
        >
            <View
                accessible
                accessibilityLabel={`${startText}${to}${endText}, ${detail}`}
                pointerEvents="none"
            >
                <Svg width={geometry.width} height={geometry.height}>
                    <HourTicks geometry={geometry} color={mixColors(colors.card, colors.muted, 0.7)} />
                    <Path
                        d={arcPath(geometry, geometry.first, 1440)}
                        stroke={isDark ? mixColors(colors.card, colors.ink, 0.1) : colors.row}
                        strokeWidth={ARC_STROKE}
                        strokeLinecap="round"
                        fill="none"
                    />
                    {shifts.map((shift, index) => index === selectedIndex ? null : (
                        <ShiftArc key={index} geometry={geometry} shift={shift} color={`${colors.accent}73`} instant={false} />
                    ))}
                    <ShiftArc
                        key={`selected-${selectedIndex}`}
                        geometry={geometry}
                        shift={selected}
                        color={colors.accent}
                        instant={dragging}
                    />
                    {/* A line through the band where shifts overlap, so one hidden under another still shows. */}
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
                    {ends.map((end) => (
                        <EndIcon key={end.minutes} x={end.x} y={geometry.endY + ICON_DROP} kind={end.icon} color={colors.ink} />
                    ))}
                </Svg>
            </View>

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

            {/* Tapping either time opens the platform's own time picker for exact entry. */}
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
                        onChange={(start) => onShiftChange(selectedIndex, { ...selected, start: Math.min(selected.end - MIN_SHIFT, start) })}
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
                <Text pointerEvents="none" className="text-center font-sans text-[11px] font-medium text-muted tabular-nums">
                    {detail}
                </Text>
            </View>
        </View>
    );
}
