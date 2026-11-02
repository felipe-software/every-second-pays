import { type EarningsPeriod, type PaymentSource, periodStart } from "@/features/earnings/model";

import {
    dayKey,
    earnedBetween,
    lastWorkEnd,
    monthKey,
    monthSpan,
    percentAt,
    recurring,
    total,
    yearKey,
    yearSpan,
} from "./routine-earnings";
import { activePause, DAY, type NotificationSettings, type ProgressLevel, type RoutineState } from "./routine-settings";

export { dayKey, earnedBetween } from "./routine-earnings";
export {
    activePause,
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    nice,
    parseSettings,
    parseState,
    pauseUntil,
    showLess,
} from "./routine-settings";
export type {
    NotificationKind,
    NotificationSettings,
    PauseChoice,
    ProgressLevel,
    RoutineState,
    WeekLevel,
} from "./routine-settings";

type Base = { key: string; amount: number; goal: number };

export type EarningsCandidate =
    | (Base & { kind: "progress"; scope: "month" | "year"; start: number; mark: number; from: number; marks: number[] })
    | (Base & { kind: "week"; start: number; days: number[] })
    | (Base & { kind: "year"; year: number })
    | (Base & { kind: "meter"; since: number });

export type RoutineCandidate = EarningsCandidate | { kind: "setup"; key: string };

type RoutineInput = {
    sources: readonly PaymentSource[];
    period: EarningsPeriod;
    settings: NotificationSettings;
    state: RoutineState;
    now: Date;
    firstDayOfWeek: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const AFTER_LAST_SHIFT = 10 * MINUTE;
const WEEK_DROPS_AFTER = 48 * HOUR;
const FINAL_DROPS_AFTER = 5 * DAY;
const YEAR_DROPS_AFTER = 14 * DAY;
const QUIET_FROM_HOUR = 21;
const QUIET_UNTIL_HOUR = 8;
export const SILENT_AFTER = 14 * DAY;
const SETUP_AFTER = 3 * DAY;
const MAX_SENT_KEYS = 64;
const CROSSING_TOLERANCE = 0.001;

export const MONTH_MARKS = [25, 50, 90, 100];
export const YEAR_MARKS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function isQuietHour(now: Date) {
    const hour = now.getHours();
    return hour >= QUIET_FROM_HOUR || hour < QUIET_UNTIL_HOUR;
}

export function ladder(period: EarningsPeriod, level: ProgressLevel) {
    const marks = period === "year" ? YEAR_MARKS : MONTH_MARKS;
    if (level === "all") return marks;
    if (level === "half") return [50, 100];
    if (level === "final") return [100];
    return [];
}

function highestCrossed(marks: readonly number[], percent: number) {
    let top = 0;
    for (const mark of marks) if (percent + CROSSING_TOLERANCE >= mark) top = mark;
    return top;
}

const earnedAll = (amount: number) => ({ amount, goal: amount });

function yearCandidate({ sources, settings, state, now, firstDayOfWeek }: RoutineInput): RoutineCandidate | null {
    if (!settings.year) return null;
    for (const at of [now, new Date(now.getFullYear() - 1, 11, 31, 12)]) {
        const span = yearSpan(at);
        const key = `year:${at.getFullYear()}`;
        if (state.sent.includes(key)) continue;
        const completion = lastWorkEnd(sources, span.start, span.days);
        if (completion == null) continue;
        const since = now.getTime() - completion;
        if (since < AFTER_LAST_SHIFT || since > YEAR_DROPS_AFTER) continue;
        return {
            kind: "year",
            key,
            year: at.getFullYear(),
            ...earnedAll(total(sources, "year", new Date(span.end.getTime() - 1), firstDayOfWeek)),
        };
    }
    return null;
}

function finalCandidate({
    sources,
    period,
    settings,
    state,
    now,
    firstDayOfWeek,
}: RoutineInput): RoutineCandidate | null {
    const marks = ladder("month", settings.progress);
    if (period === "year" || !marks.includes(100)) return null;
    for (const at of [now, new Date(now.getFullYear(), now.getMonth(), 0, 12)]) {
        const span = monthSpan(at);
        const month = monthKey(at);
        const key = `progress:${month}:100`;
        if (state.sent.includes(key) || (state.handled[month] ?? 0) >= 100) continue;
        const completion = lastWorkEnd(sources, span.start, span.days);
        if (completion == null) continue;
        const since = now.getTime() - completion;
        if (since < AFTER_LAST_SHIFT || since > FINAL_DROPS_AFTER) continue;
        const amount = total(sources, "month", new Date(span.end.getTime() - 1), firstDayOfWeek);
        if (amount <= 0) continue;
        return {
            kind: "progress",
            scope: "month",
            key,
            start: span.start.getTime(),
            mark: 100,
            from: 0,
            marks,
            ...earnedAll(amount),
        };
    }
    return null;
}

function milestoneCandidate({
    sources,
    period,
    settings,
    state,
    now,
    firstDayOfWeek,
}: RoutineInput): RoutineCandidate | null {
    const scope = period === "year" ? "year" : "month";
    const marks = ladder(period, settings.progress).filter((mark) => mark < 100);
    if (!marks.length) return null;
    const span = scope === "year" ? yearSpan(now) : monthSpan(now);
    const periodKey = scope === "year" ? yearKey(now) : monthKey(now);
    const { percent, earned, expected } = percentAt({ sources, scope, span, now, firstDayOfWeek });
    if (expected <= 0) return null;
    const mark = highestCrossed(marks, percent);
    const handled = state.handled[periodKey] ?? 0;
    if (mark === 0 || mark <= handled) return null;
    const allMarks = ladder(period, settings.progress);
    return {
        kind: "progress",
        scope,
        key: `progress:${periodKey}:${mark}`,
        start: span.start.getTime(),
        mark,
        from: highestCrossed(allMarks, handled),
        marks: allMarks,
        amount: earned,
        goal: expected,
    };
}

function weekNumber(start: Date) {
    return Math.floor(start.getTime() / (7 * DAY));
}

function weekCandidate({ sources, settings, state, now, firstDayOfWeek }: RoutineInput): RoutineCandidate | null {
    if (settings.week === "off") return null;
    const current = periodStart("week", now, firstDayOfWeek);
    for (const offset of [0, -7]) {
        const start = new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset);
        const key = `week:${dayKey(start)}`;
        if (state.sent.includes(key)) continue;
        if (settings.week === "other" && weekNumber(start) % 2 !== 0) continue;
        const completion = lastWorkEnd(sources, start, 7);
        if (completion == null) continue;
        const since = now.getTime() - completion;
        if (since < AFTER_LAST_SHIFT || since > WEEK_DROPS_AFTER) continue;
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
        const amount = total(sources, "week", new Date(end.getTime() - 1), firstDayOfWeek);
        if (amount <= 0) continue;
        const days = [...new Set(recurring(sources).flatMap((source) => source.days))];
        days.sort((a, b) => ((a - firstDayOfWeek + 7) % 7) - ((b - firstDayOfWeek + 7) % 7));
        return { kind: "week", key, start: start.getTime(), days, ...earnedAll(amount) };
    }
    return null;
}

function meterCandidate({ sources, settings, state, now }: RoutineInput): RoutineCandidate | null {
    if (!settings.meter || state.lastOpenedAt == null) return null;
    const amount = earnedBetween(sources, state.lastOpenedAt, now);
    if (amount <= 0) return null;
    return { kind: "meter", key: `meter:${state.lastOpenedAt}`, since: state.lastOpenedAt, ...earnedAll(amount) };
}

function setupCandidate({ state, now }: RoutineInput): RoutineCandidate | null {
    if (state.setupSettled || state.onboardedAt == null) return null;
    return now.getTime() - state.onboardedAt >= SETUP_AFTER ? { kind: "setup", key: "setup" } : null;
}

export function nextNotification(input: RoutineInput): RoutineCandidate | null {
    const { settings, state, now, sources } = input;
    if (activePause(settings, now.getTime()) !== "none") return null;
    if (isQuietHour(now) || state.lastSentDay === dayKey(now)) return null;
    if (!sources.length) return setupCandidate(input);
    if (!recurring(sources).length) return null;
    if (state.lastOpenedAt != null && now.getTime() - state.lastOpenedAt >= SILENT_AFTER) {
        return state.silenceSince === state.lastOpenedAt ? null : meterCandidate(input);
    }
    return yearCandidate(input) ?? finalCandidate(input) ?? milestoneCandidate(input) ?? weekCandidate(input);
}

export function recordSent(state: RoutineState, candidate: RoutineCandidate, now: Date): RoutineState {
    const handled = { ...state.handled };
    if (candidate.kind === "progress") {
        const period = candidate.key.split(":")[1];
        handled[period] = Math.max(handled[period] ?? 0, candidate.mark);
    }
    return {
        ...state,
        handled,
        sent: [...state.sent, candidate.key].slice(-MAX_SENT_KEYS),
        lastSentDay: dayKey(now),
        silenceSince: candidate.kind === "meter" ? candidate.since : state.silenceSince,
        setupSettled: state.setupSettled || candidate.kind === "setup",
    };
}

export function markCrossedHandled({
    state,
    sources,
    period,
    now,
    firstDayOfWeek,
}: Omit<RoutineInput, "settings">): RoutineState {
    const handled = { ...state.handled };
    const scope = period === "year" ? "year" : "month";
    const span = scope === "year" ? yearSpan(now) : monthSpan(now);
    const periodKey = scope === "year" ? yearKey(now) : monthKey(now);
    const { percent } = percentAt({ sources, scope, span, now, firstDayOfWeek });
    handled[periodKey] = Math.max(
        handled[periodKey] ?? 0,
        highestCrossed(scope === "year" ? YEAR_MARKS : MONTH_MARKS, percent),
    );
    if (scope === "month") {
        const previous = monthSpan(new Date(now.getFullYear(), now.getMonth(), 0, 12));
        const completion = lastWorkEnd(sources, previous.start, previous.days);
        if (completion != null && now.getTime() - completion <= FINAL_DROPS_AFTER)
            handled[monthKey(previous.start)] = 100;
    }
    return { ...state, handled };
}
