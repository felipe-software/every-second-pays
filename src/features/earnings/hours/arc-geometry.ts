// Geometry for the low hours arc: a shallow bow from the morning at its left end to midnight
// at its right, with the afternoon at its peak.

import type { Shift } from "../model";

const DAY = 1440;
/** Half the angle the arc sweeps, measured from its peak. */
const HALF_SWEEP = (70 * Math.PI) / 180;
const MAX_RADIUS = 140;
/** Room beside each end for its handle and icon. */
const SIDE_ROOM = 24;
/** Room above the peak for the hour ticks and labels. */
const TOP_ROOM = 36;
/** Room under the ends for their icons and labels. */
const BOTTOM_ROOM = 54;
/** The arc starts at 6 AM unless a shift starts earlier; then it reaches back in 3-hour steps. */
const DEFAULT_FIRST = 360;
const FIRST_STEP = 180;

export const ARC_STROKE = 16;
export const ARC_STEP = 15;
export const MIN_SHIFT = 15;
/** Horizontal padding inside the raised time pills drawn under the arc (Android). */
export const INLINE_TIME_PADDING = 5;

export type ArcGeometry = {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
    /** Height of the arc's two ends. */
    endY: number;
    /** The minute of the day at the arc's left end; its right end is always midnight. */
    first: number;
};

export function firstArcMinute(shifts: readonly Shift[]) {
    const earliest = Math.min(...shifts.map((shift) => shift.start));
    return Math.min(DEFAULT_FIRST, Math.floor(earliest / FIRST_STEP) * FIRST_STEP);
}

export function arcGeometry(width: number, first: number): ArcGeometry {
    const radius = Math.min(MAX_RADIUS, (width / 2 - SIDE_ROOM) / Math.sin(HALF_SWEEP));
    const centerY = TOP_ROOM + radius;
    const endY = centerY - radius * Math.cos(HALF_SWEEP);
    return { width, height: endY + BOTTOM_ROOM, centerX: width / 2, centerY, radius, endY, first };
}

export function pointAt(geometry: ArcGeometry, minutes: number, radius?: number) {
    "worklet";
    const distance = radius ?? geometry.radius;
    const progress = (minutes - geometry.first) / (DAY - geometry.first);
    const angle = (progress * 2 - 1) * HALF_SWEEP;
    return {
        x: geometry.centerX + distance * Math.sin(angle),
        y: geometry.centerY - distance * Math.cos(angle),
    };
}

/** The SVG path of a shift's stretch of the arc. */
export function arcPath(geometry: ArcGeometry, start: number, end: number) {
    "worklet";
    const from = pointAt(geometry, start);
    const to = pointAt(geometry, Math.max(start, end));
    return `M ${from.x} ${from.y} A ${geometry.radius} ${geometry.radius} 0 0 1 ${to.x} ${to.y}`;
}

function angleAt(geometry: ArcGeometry, x: number, y: number) {
    return Math.atan2(x - geometry.centerX, geometry.centerY - y);
}

/** The minute under a point, snapped to the step and held within the arc's ends. */
export function minutesAt(geometry: ArcGeometry, x: number, y: number) {
    const angle = Math.min(HALF_SWEEP, Math.max(-HALF_SWEEP, angleAt(geometry, x, y)));
    const minutes = geometry.first + ((angle / HALF_SWEEP + 1) / 2) * (DAY - geometry.first);
    return Math.round(minutes / ARC_STEP) * ARC_STEP;
}

export function isOnArc(geometry: ArcGeometry, x: number, y: number) {
    const distance = Math.hypot(x - geometry.centerX, y - geometry.centerY);
    return Math.abs(distance - geometry.radius) <= ARC_STROKE
        && Math.abs(angleAt(geometry, x, y)) <= HALF_SWEEP;
}

/** Every hour from the arc's first minute to midnight. */
export function arcHours(geometry: ArcGeometry) {
    return Array.from({ length: (DAY - geometry.first) / 60 + 1 }, (_, index) => geometry.first + index * 60);
}

export function isMajorHour(minutes: number) {
    return minutes % FIRST_STEP === 0;
}

/**
 * The widest row that fits inside the arc with its top edge `rise` above the ends, clear of
 * the handles riding the arc.
 */
export function innerWidthAt(geometry: ArcGeometry, rise: number, handleRadius: number) {
    const inner = geometry.radius - handleRadius;
    const height = geometry.centerY - geometry.endY + rise;
    return 2 * Math.sqrt(Math.max(0, inner * inner - height * height));
}
