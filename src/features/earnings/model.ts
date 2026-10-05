export type Frequency = "hour" | "week" | "month" | "year" | "second" | "once";

export type Shift = { start: number; end: number };

export type PaymentSource = {
    id: number;
    name: string;
    frequency: Frequency;
    amount: number;
    days: number[];
    shifts: Shift[];
    when?: "today" | "later";
    /**
     * When a one-time payment landed (ms since epoch). Set when it's saved as landed today;
     * older records don't have it and count in every period.
     */
    paidAt?: number;
};

export type PaymentDraft = Omit<PaymentSource, "id" | "amount" | "paidAt"> & {
    amount: string;
};

/** The span the Earnings screen totals: from local midnight at its start until now. */
export type EarningsPeriod = "today" | "week" | "month" | "year";

export const PERIODS: readonly EarningsPeriod[] = ["today", "week", "month", "year"];

export const FREQUENCIES: Frequency[] = ["hour", "week", "month", "year", "second", "once"];

export const HOUR_PRESETS = [
    { id: "nineToFive", shifts: [{ start: 540, end: 1020 }] },
    {
        id: "splitDay",
        shifts: [
            { start: 540, end: 660 },
            { start: 720, end: 1020 },
        ],
    },
    { id: "mornings", shifts: [{ start: 480, end: 720 }] },
    { id: "evenings", shifts: [{ start: 1080, end: 1320 }] },
] as const;

export const EMPTY_DRAFT: PaymentDraft = {
    name: "",
    amount: "",
    frequency: "month",
    when: "today",
    days: [1, 2, 3, 4, 5],
    shifts: [{ start: 540, end: 1020 }],
};

export function parseAmount(value: string) {
    return Number(value.replace(",", ".")) || 0;
}

export function hoursPerDay(source: { shifts: readonly Shift[] }) {
    return source.shifts.reduce(
        (total, shift) => total + Math.max(0, shift.end - shift.start) / 60,
        0,
    );
}

export function ratePerSecond(source: Pick<PaymentSource, "amount" | "frequency" | "days" | "shifts">) {
    if (source.frequency === "once") return 0;
    if (source.frequency === "second") return source.amount;
    if (source.frequency === "hour") return source.amount / 3600;

    const weeklyHours = hoursPerDay(source) * source.days.length;
    if (!weeklyHours) return 0;
    if (source.frequency === "week") return source.amount / (weeklyHours * 3600);
    if (source.frequency === "year") return source.amount / (weeklyHours * 3600 * 52);
    return source.amount / ((weeklyHours * 3600 * 52) / 12);
}

export function currentShift(source: Pick<PaymentSource, "frequency" | "days" | "shifts">, now: Date) {
    if (source.frequency === "once" || !source.days.includes(now.getDay())) return undefined;
    const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    return source.shifts.find((shift) => minute >= shift.start && minute < shift.end);
}

export function earnedToday(source: PaymentSource, now: Date) {
    if (source.frequency === "once") return source.when === "today" ? source.amount : 0;
    if (!source.days.includes(now.getDay())) return 0;

    const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const elapsedSeconds = source.shifts.reduce(
        (total, shift) =>
            total + Math.min(Math.max(minute - shift.start, 0), Math.max(0, shift.end - shift.start)) * 60,
        0,
    );
    return elapsedSeconds * ratePerSecond(source);
}

/**
 * Local midnight at the start of `period`. Weeks start on `firstDayOfWeek`
 * (0 = Sunday … 6 = Saturday).
 */
export function periodStart(period: EarningsPeriod, now: Date, firstDayOfWeek: number) {
    const year = now.getFullYear();
    const month = now.getMonth();
    if (period === "year") return new Date(year, 0, 1);
    if (period === "month") return new Date(year, month, 1);
    const daysIntoWeek = period === "week" ? (now.getDay() - firstDayOfWeek + 7) % 7 : 0;
    return new Date(year, month, now.getDate() - daysIntoWeek);
}

/** Whole days from `from` to `to`, both local midnights; rounded so DST days still count as one. */
function daysBetween(from: Date, to: Date) {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** How many of the `count` consecutive days starting on weekday `firstDay` fall on one of `days`. */
export function countWeekdays(days: readonly number[], firstDay: number, count: number) {
    const fullWeeks = Math.floor(count / 7);
    let total = fullWeeks * new Set(days).size;
    for (let offset = 0; offset < count % 7; offset += 1) {
        if (days.includes((firstDay + offset) % 7)) total += 1;
    }
    return total;
}

/**
 * What a source earned from the start of `period` until `now`: every full working day
 * before today, plus today so far. A one-time payment counts if it landed in the period.
 */
export function earnedInPeriod(source: PaymentSource, period: EarningsPeriod, now: Date, firstDayOfWeek: number) {
    const start = periodStart(period, now, firstDayOfWeek);
    if (source.frequency === "once") {
        if (source.when !== "today") return 0;
        return source.paidAt == null || source.paidAt >= start.getTime() ? source.amount : 0;
    }

    const today = periodStart("today", now, firstDayOfWeek);
    const pastDays = countWeekdays(source.days, start.getDay(), daysBetween(start, today));
    return pastDays * hoursPerDay(source) * 3600 * ratePerSecond(source) + earnedToday(source, now);
}

/** Whether a timestamp falls on the same local calendar day as `now`. */
export function isSameDay(timestamp: number, now: Date) {
    const date = new Date(timestamp);
    return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
}

export function dateFromMinutes(totalMinutes: number) {
    const minutes = ((totalMinutes % 1440) + 1440) % 1440;
    return new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60);
}

export function sameShifts(a: readonly Shift[], b: readonly Shift[]) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function sourceToDraft(source: PaymentSource): PaymentDraft {
    return {
        ...source,
        amount: String(source.amount),
        days: [...source.days],
        shifts: source.shifts.map((shift) => ({ ...shift })),
    };
}
