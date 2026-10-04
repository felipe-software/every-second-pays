import { useEffect, useRef, useState } from "react";
import { type GestureResponderEvent, Platform, Text, View } from "react-native";
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { mixColors } from "@/features/appearance/color";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { hoursPerDay, type Shift } from "../model";
import { SystemTimeInput } from "../system-time-input";
import { useEarningsTheme, useSheetCard } from "../theme";
import {
    DIAL_CENTER,
    DIAL_RADIUS,
    DIAL_SIZE,
    DIAL_STROKE,
    MIN_SHIFT,
    arcPath,
    distanceFromCenter,
    minutesAt,
    pointAt,
    unwrapNear,
} from "./dial-geometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HANDLE_RADIUS = 11;
const HANDLE_HIT_RADIUS = 30;
const LABEL_RADIUS = DIAL_RADIUS + DIAL_STROKE / 2 + 18;
const LABEL_MARKS = [0, 360, 720, 1080];
// Room for the times inside the ring, and the size range they shrink through to fit it.
const CENTER_WIDTH = (DIAL_RADIUS - DIAL_STROKE / 2) * 2 - 18;
const CENTER_FONT = { max: 20, min: 12 };
// Archivo Bold averages a little over half an em per character.
const CHARACTER_WIDTH = 0.56;
const MORPH = { duration: 280, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

type Edge = "start" | "end";
type TouchState = {
    drag: { edge: Edge; index: number; shift: Shift } | null;
    tappedIndex: number;
    /** Offset from page to dial coordinates; moves only report page coordinates reliably. */
    origin: { x: number; y: number };
};

const IDLE_TOUCH: TouchState = { drag: null, tappedIndex: -1, origin: { x: 0, y: 0 } };

function handleAt(shift: Shift, x: number, y: number): Edge | null {
    const [start, end] = (["start", "end"] as const).map((edge) => {
        const point = pointAt(shift[edge]);
        return { edge, distance: Math.hypot(point.x - x, point.y - y) };
    });
    const nearest = start.distance <= end.distance ? start : end;
    return nearest.distance <= HANDLE_HIT_RADIUS ? nearest.edge : null;
}

/** Moves one end of a shift to the touch, never letting it cross the other end. */
function dragShift(shift: Shift, edge: Edge, x: number, y: number): Shift | null {
    const minutes = unwrapNear(minutesAt(x, y), shift[edge]);
    const next = edge === "start"
        ? { ...shift, start: Math.min(Math.max(minutes, 0), shift.end - MIN_SHIFT) }
        : { ...shift, end: Math.max(Math.min(minutes, 1440), shift.start + MIN_SHIFT) };
    return next.start === shift.start && next.end === shift.end ? null : next;
}

function shiftIndexAt(shifts: readonly Shift[], x: number, y: number) {
    if (Math.abs(distanceFromCenter(x, y) - DIAL_RADIUS) > DIAL_STROKE) return -1;
    const minutes = minutesAt(x, y);
    return shifts.findIndex((shift) => minutes >= shift.start && minutes < shift.end);
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

function ShiftArc({ shift, color, instant }: { shift: Shift; color: string; instant: boolean }) {
    const { start, end } = useShiftMinutes(shift, instant);
    const animatedProps = useAnimatedProps(() => ({ d: arcPath(start.get(), end.get()) }));

    return (
        <AnimatedPath
            animatedProps={animatedProps}
            stroke={color}
            strokeWidth={DIAL_STROKE}
            strokeLinecap="round"
            fill="none"
        />
    );
}

function ShiftHandles({ shift, fill, stroke, instant }: { shift: Shift; fill: string; stroke: string; instant: boolean }) {
    const { start, end } = useShiftMinutes(shift, instant);
    const startProps = useAnimatedProps(() => {
        const point = pointAt(start.get());
        return { cx: point.x, cy: point.y };
    });
    const endProps = useAnimatedProps(() => {
        const point = pointAt(end.get());
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

/**
 * A 24-hour ring (midnight at the top) showing every shift of the day. The selected shift
 * has handles to drag its start and end; tapping another shift's arc selects it, and the
 * times in the middle open the platform time picker.
 */
export function DayDial({
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
    const card = useSheetCard();
    const { t, formatNumber, formatTime, formatTimeRange, formatTimeRangeParts } = useI18n();
    const [dragging, setDragging] = useState(false);
    // A drag spans many renders, so its state lives in a ref.
    const touch = useRef<TouchState>(IDLE_TOUCH);

    const selected = shifts[selectedIndex];
    const hours = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });
    const detail = shifts.length > 1
        ? t("payment.shiftOfDay", { hours: hours(hoursPerDay({ shifts: [selected] })), total: hours(hoursPerDay({ shifts })) })
        : t("payment.hoursPerDay", { hours: hours(hoursPerDay({ shifts })) });
    const [startText, endText] = formatTimeRangeParts(selected.start, selected.end);
    const rangeLength = `${startText} – ${endText}`.length;
    const centerFont = Math.max(
        CENTER_FONT.min,
        Math.min(CENTER_FONT.max, Math.floor(CENTER_WIDTH / (rangeLength * CHARACTER_WIDTH))),
    );

    const finishTouch = () => {
        touch.current = IDLE_TOUCH;
        setDragging(false);
    };

    // The dial uses the JS responder system rather than a gesture handler: becoming the
    // responder makes Android stop the sheet and its scroll view from stealing the drag.
    // It only claims touches that start on a handle or on another shift's arc, so the
    // sheet still scrolls and the time buttons in the middle keep their own taps.
    const responder = {
        onStartShouldSetResponder: (event: GestureResponderEvent) => {
            const { locationX: x, locationY: y, pageX, pageY } = event.nativeEvent;
            const edge = handleAt(selected, x, y);
            const tappedIndex = edge ? -1 : shiftIndexAt(shifts, x, y);
            if (!edge && (tappedIndex < 0 || tappedIndex === selectedIndex)) return false;
            touch.current = {
                drag: edge ? { edge, index: selectedIndex, shift: selected } : null,
                tappedIndex,
                origin: { x: x - pageX, y: y - pageY },
            };
            if (edge) setDragging(true);
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
            const next = dragShift(drag.shift, drag.edge, origin.x + pageX, origin.y + pageY);
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
        <View {...responder} className="self-center" style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
            <View
                accessible
                accessibilityLabel={`${formatTimeRange(selected.start, selected.end, " – ")}, ${detail}`}
                pointerEvents="none"
            >
                <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
                    <Circle
                        cx={DIAL_CENTER}
                        cy={DIAL_CENTER}
                        r={DIAL_RADIUS}
                        stroke={isDark ? mixColors(card, colors.ink, 0.1) : colors.row}
                        strokeWidth={DIAL_STROKE}
                        fill="none"
                    />
                    {shifts.map((shift, index) => index === selectedIndex ? null : (
                        <ShiftArc key={index} shift={shift} color={`${colors.accent}73`} instant={false} />
                    ))}
                    <ShiftArc key={`selected-${selectedIndex}`} shift={selected} color={colors.accent} instant={dragging} />
                    <ShiftHandles
                        key={`handles-${selectedIndex}`}
                        shift={selected}
                        fill={isDark ? colors.ink : "#FFFFFF"}
                        stroke={colors.accentDeep}
                        instant={dragging}
                    />
                </Svg>
            </View>

            {LABEL_MARKS.map((minutes) => {
                const point = pointAt(minutes, LABEL_RADIUS);
                return (
                    <Text
                        key={minutes}
                        pointerEvents="none"
                        importantForAccessibility="no"
                        className="absolute w-14 text-center font-sans text-[10.5px] font-medium text-muted"
                        style={{ left: point.x - 28, top: point.y - 7 }}
                    >
                        {formatTime(minutes)}
                    </Text>
                );
            })}

            {/* Tapping either time opens the platform's own time picker for exact entry. */}
            <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center gap-1">
                <View
                    className={Platform.OS === "ios" ? "items-center gap-1" : "flex-row items-center"}
                    style={{ maxWidth: CENTER_WIDTH }}
                >
                    <SystemTimeInput
                        variant="inline"
                        label={t("payment.start")}
                        text={startText}
                        fontSize={centerFont}
                        value={selected.start}
                        onChange={(start) => onShiftChange(selectedIndex, { ...selected, start: Math.min(selected.end - MIN_SHIFT, start) })}
                    />
                    {Platform.OS === "ios" ? null : (
                        <Text className="font-sans font-bold text-ink" style={{ fontSize: centerFont }}> – </Text>
                    )}
                    <SystemTimeInput
                        variant="inline"
                        label={t("payment.end")}
                        text={endText}
                        fontSize={centerFont}
                        value={selected.end}
                        onChange={(selectedEnd) => {
                            const end = selectedEnd === 0 ? 1440 : selectedEnd;
                            onShiftChange(selectedIndex, { ...selected, end: Math.max(selected.start + MIN_SHIFT, end) });
                        }}
                    />
                </View>
                <Text pointerEvents="none" style={{ maxWidth: CENTER_WIDTH }} className="text-center font-sans text-[11px] font-medium text-muted">
                    {detail}
                </Text>
            </View>
        </View>
    );
}
