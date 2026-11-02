import { earnedInPeriod, type EarningsPeriod, earnedToday, type PaymentSource } from "@/features/earnings/model";

import { DAY } from "./routine-settings";

export function dayKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export const monthKey = (date: Date) => dayKey(date).slice(0, 7);
export const yearKey = (date: Date) => String(date.getFullYear());

export function recurring(sources: readonly PaymentSource[]) {
    return sources.filter(
        (source) =>
            source.frequency !== "once" &&
            source.days.length > 0 &&
            source.shifts.some((shift) => shift.end > shift.start),
    );
}

function latestShiftEnd(sources: readonly PaymentSource[], weekday: number) {
    let latest = -1;
    for (const source of sources) {
        if (!source.days.includes(weekday)) continue;
        for (const shift of source.shifts) if (shift.end > shift.start) latest = Math.max(latest, shift.end);
    }
    return latest;
}

export function lastWorkEnd(sources: readonly PaymentSource[], start: Date, days: number) {
    const working = recurring(sources);
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
        const latest = latestShiftEnd(working, day.getDay());
        if (latest >= 0) return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, latest).getTime();
    }
    return null;
}

export function total(sources: readonly PaymentSource[], period: EarningsPeriod, at: Date, firstDayOfWeek: number) {
    return sources.reduce((sum, source) => sum + earnedInPeriod(source, period, at, firstDayOfWeek), 0);
}

function spanDays(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / DAY);
}

export function monthSpan(at: Date) {
    const start = new Date(at.getFullYear(), at.getMonth(), 1);
    const end = new Date(at.getFullYear(), at.getMonth() + 1, 1);
    return { start, end, days: spanDays(start, end) };
}

export function yearSpan(at: Date) {
    const start = new Date(at.getFullYear(), 0, 1);
    const end = new Date(at.getFullYear() + 1, 0, 1);
    return { start, end, days: spanDays(start, end) };
}

type PercentQuery = {
    sources: readonly PaymentSource[];
    scope: "month" | "year";
    span: { start: Date; end: Date; days: number };
    now: Date;
    firstDayOfWeek: number;
};

export function percentAt({ sources, scope, span, now, firstDayOfWeek }: PercentQuery) {
    const completion = lastWorkEnd(sources, span.start, span.days);
    if (completion == null) return { percent: 0, completion: null, expected: 0, earned: 0 };
    const expected = total(sources, scope, new Date(span.end.getTime() - 1), firstDayOfWeek);
    const earned = total(sources, scope, now, firstDayOfWeek);
    if (expected <= 0) return { percent: 0, completion, expected, earned };
    const percent = now.getTime() >= completion ? 100 : Math.min(99.99, (earned / expected) * 100);
    return { percent, completion, expected, earned };
}

export function earnedBetween(sources: readonly PaymentSource[], from: number, now: Date) {
    let sum = 0;
    const start = new Date(from);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (const source of recurring(sources)) {
        sum += earnedToday(source, now);
        if (start >= today) {
            sum -= earnedToday(source, start);
            continue;
        }
        for (
            let day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            day >= start || dayKey(day) === dayKey(start);
            day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1)
        ) {
            const lastMoment = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
            sum += earnedToday(source, lastMoment);
            if (dayKey(day) === dayKey(start)) {
                sum -= earnedToday(source, start);
                break;
            }
        }
    }
    return Math.max(0, sum);
}
