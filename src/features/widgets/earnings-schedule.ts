import {
    currentShift,
    earnedInPeriod,
    type EarningsPeriod,
    type PaymentSource,
    ratePerSecond,
} from "@/features/earnings/model";

/** `[time in ms, total in cents at that time, cents per millisecond after it]` */
export type Breakpoint = [number, number, number];

const DAY_MINUTES = 1440;

/**
 * Every instant the period total can stop growing linearly: shift edges, where the rate
 * changes, and local midnights, where periods start (and one-time payments start or stop
 * counting). Local `Date` arithmetic keeps the instants right across DST changes.
 */
function changeInstants(sources: readonly PaymentSource[], from: Date, until: number) {
    const minutes = new Set<number>([0]);
    for (const source of sources) {
        if (source.frequency === "once") continue;
        for (const shift of source.shifts) {
            minutes.add(Math.max(0, Math.min(DAY_MINUTES, shift.start)));
            minutes.add(Math.max(0, Math.min(DAY_MINUTES, shift.end)));
        }
    }
    const instants = new Set<number>([from.getTime()]);
    for (let day = 0; ; day += 1) {
        const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate() + day);
        if (midnight.getTime() > until) break;
        for (const minute of minutes) {
            const instant = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate(), 0, minute).getTime();
            if (instant > from.getTime() && instant <= until) instants.add(instant);
        }
    }
    return [...instants].sort((a, b) => a - b);
}

/**
 * The period total as breakpoints for the widget to interpolate between, from `now` until
 * `horizonMs` later. It's computed with the same model as the Earnings screen, so the widget
 * can't drift from it. After the last breakpoint the rate is 0: a widget left alone past the
 * horizon stops counting instead of guessing.
 */
export function buildEarningsSchedule(
    sources: readonly PaymentSource[],
    period: EarningsPeriod,
    now: Date,
    firstDayOfWeek: number,
    horizonMs = 21 * 86_400_000,
): Breakpoint[] {
    // The model counts whole seconds, so start on one.
    const start = new Date(Math.floor(now.getTime() / 1000) * 1000);
    const instants = changeInstants(sources, start, start.getTime() + horizonMs);
    const points: Breakpoint[] = [];
    instants.forEach((time, index) => {
        const at = new Date(time);
        const total = sources.reduce((sum, source) => sum + earnedInPeriod(source, period, at, firstDayOfWeek), 0);
        const last = index === instants.length - 1;
        const rate = last ? 0 : sources.reduce(
            (sum, source) => sum + (currentShift(source, at) ? ratePerSecond(source) : 0),
            0,
        );
        const point: Breakpoint = [time, total * 100, (rate * 100) / 1000];
        // Skip breakpoints that just continue the previous segment.
        const previous = points.at(-1);
        if (previous && !last && previous[2] === point[2]
            && Math.abs(previous[1] + previous[2] * (time - previous[0]) - point[1]) < 1e-6) return;
        points.push(point);
    });
    return points;
}

/** Evaluates a schedule the way the widget does. */
export function scheduleValueAt(schedule: readonly Breakpoint[], time: number) {
    let current: Breakpoint | undefined;
    for (const point of schedule) {
        if (point[0] > time) break;
        current = point;
    }
    if (!current) return schedule[0]?.[1] ?? 0;
    return current[1] + current[2] * (time - current[0]);
}
