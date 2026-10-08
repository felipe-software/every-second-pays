import type { Shift } from "../model";

const DAY = 1440;
const HALF_SWEEP = (70 * Math.PI) / 180;
const MAX_RADIUS = 140;
const SIDE_ROOM = 24;
const TOP_ROOM = 36;
const BOTTOM_ROOM = 54;
const DEFAULT_FIRST = 360;
const FIRST_STEP = 180;

export const ARC_STROKE = 16;
export const ARC_STEP = 15;
export const MIN_SHIFT = 15;
export const INLINE_TIME_PADDING = 5;

export type ArcGeometry = {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    radius: number;
    endY: number;
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

export function arcPath(geometry: ArcGeometry, start: number, end: number) {
    "worklet";
    const from = pointAt(geometry, start);
    const to = pointAt(geometry, Math.max(start, end));
    return `M ${from.x} ${from.y} A ${geometry.radius} ${geometry.radius} 0 0 1 ${to.x} ${to.y}`;
}

function angleAt(geometry: ArcGeometry, x: number, y: number) {
    return Math.atan2(x - geometry.centerX, geometry.centerY - y);
}

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

export function arcHours(geometry: ArcGeometry) {
    return Array.from({ length: (DAY - geometry.first) / 60 + 1 }, (_, index) => geometry.first + index * 60);
}

export function isMajorHour(minutes: number) {
    return minutes % FIRST_STEP === 0;
}

export function innerWidthAt(geometry: ArcGeometry, rise: number, handleRadius: number) {
    const inner = geometry.radius - handleRadius;
    const height = geometry.centerY - geometry.endY + rise;
    return 2 * Math.sqrt(Math.max(0, inner * inner - height * height));
}
