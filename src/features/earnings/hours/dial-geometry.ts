// Geometry for the 24-hour dial: midnight at the top, time running clockwise.

// Worklets can't read exported bindings, so the UI-thread math uses these local copies.
const SIZE = 250;
const CENTER = SIZE / 2;
const RADIUS = 80;

export const DIAL_SIZE = SIZE;
export const DIAL_CENTER = CENTER;
export const DIAL_RADIUS = RADIUS;
export const DIAL_STROKE = 22;
export const DIAL_STEP = 15;
export const MIN_SHIFT = 15;
/** Horizontal padding inside the raised time pills drawn in the middle of the dial (Android). */
export const INLINE_TIME_PADDING = 5;
const DAY = 1440;

export function pointAt(minutes: number, radius?: number) {
    "worklet";
    const distance = radius ?? RADIUS;
    const angle = (minutes / DAY) * Math.PI * 2;
    return { x: CENTER + distance * Math.sin(angle), y: CENTER - distance * Math.cos(angle) };
}

/** The SVG path of a shift's arc. A whole day is drawn as two half arcs so it closes. */
export function arcPath(start: number, end: number) {
    "worklet";
    const span = Math.max(0, end - start);
    if (span >= DAY - 0.5) {
        const top = pointAt(0);
        const bottom = pointAt(DAY / 2);
        return `M ${top.x} ${top.y} A ${RADIUS} ${RADIUS} 0 1 1 ${bottom.x} ${bottom.y} A ${RADIUS} ${RADIUS} 0 1 1 ${top.x} ${top.y}`;
    }
    const from = pointAt(start);
    const to = pointAt(start + span);
    return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${span > DAY / 2 ? 1 : 0} 1 ${to.x} ${to.y}`;
}

export function minutesAt(x: number, y: number) {
    const angle = Math.atan2(x - DIAL_CENTER, DIAL_CENTER - y);
    return (((angle / (Math.PI * 2)) * DAY) + DAY) % DAY;
}

export function distanceFromCenter(x: number, y: number) {
    return Math.hypot(x - DIAL_CENTER, y - DIAL_CENTER);
}

/**
 * Snaps a dial reading to the step and unwraps it next to the previous value, so dragging
 * an end handle through midnight lands on 24:00 instead of jumping back to 0:00.
 */
export function unwrapNear(minutes: number, previous: number) {
    const snapped = Math.round(minutes / DIAL_STEP) * DIAL_STEP;
    return [snapped - DAY, snapped, snapped + DAY].reduce((best, candidate) =>
        Math.abs(candidate - previous) < Math.abs(best - previous) ? candidate : best,
    );
}
