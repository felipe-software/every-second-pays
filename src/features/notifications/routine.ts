import {
    earnedInPeriod,
    type EarningsPeriod,
    earnedToday,
    type PaymentSource,
    periodStart,
} from "@/features/earnings/model";

export type WeekLevel = "every" | "other" | "off";
export type ProgressLevel = "all" | "half" | "final" | "off";
export type NotificationKind = "week" | "progress" | "year" | "meter";
export type PauseChoice = "none" | "week" | "twoWeeks" | "forever";

export type NotificationSettings = {
    week: WeekLevel;
    progress: ProgressLevel;
    year: boolean;
    meter: boolean;
    showAmounts: boolean;
    pause: PauseChoice;
    pausedUntil: number | null;
    lessSteps: Record<NotificationKind, number>;
};

export type RoutineState = {
    sent: string[];
    lastSentDay: string | null;
    handled: Record<string, number>;
    lastOpenedAt: number | null;
    silenceSince: number | null;
    niceTaps: number;
    onboardedAt: number | null;
    setupSettled: boolean;
};

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
const DAY = 24 * HOUR;
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
const WEEK_LEVELS: readonly WeekLevel[] = ["every", "other", "off"];
const PROGRESS_LEVELS: readonly ProgressLevel[] = ["all", "half", "final", "off"];

export const DEFAULT_SETTINGS: NotificationSettings = {
    week: "every",
    progress: "all",
    year: true,
    meter: true,
    showAmounts: true,
    pause: "none",
    pausedUntil: null,
    lessSteps: { week: 0, progress: 0, year: 0, meter: 0 },
};

export const EMPTY_STATE: RoutineState = {
    sent: [],
    lastSentDay: null,
    handled: {},
    lastOpenedAt: null,
    silenceSince: null,
    niceTaps: 0,
    onboardedAt: null,
    setupSettled: false,
};

const pick = <T>(allowed: readonly T[], value: unknown, fallback: T) => (allowed.includes(value as T) ? (value as T) : fallback);

export function parseSettings(value: unknown): NotificationSettings {
    const data = value && typeof value === "object" ? (value as Partial<NotificationSettings>) : {};
    const steps = data.lessSteps && typeof data.lessSteps === "object" ? data.lessSteps : DEFAULT_SETTINGS.lessSteps;
    return {
        week: pick(WEEK_LEVELS, data.week, "every"),
        progress: pick(PROGRESS_LEVELS, data.progress, "all"),
        year: data.year !== false,
        meter: data.meter !== false,
        showAmounts: data.showAmounts !== false,
        pause: pick<PauseChoice>(["none", "week", "twoWeeks", "forever"], data.pause, "none"),
        pausedUntil: typeof data.pausedUntil === "number" ? data.pausedUntil : null,
        lessSteps: {
            week: Number(steps.week) || 0,
            progress: Number(steps.progress) || 0,
            year: Number(steps.year) || 0,
            meter: Number(steps.meter) || 0,
        },
    };
}

export function parseState(value: unknown): RoutineState {
    const data = value && typeof value === "object" ? (value as Partial<RoutineState>) : {};
    return {
        sent: Array.isArray(data.sent) ? data.sent.filter((key) => typeof key === "string") : [],
        lastSentDay: typeof data.lastSentDay === "string" ? data.lastSentDay : null,
        handled: data.handled && typeof data.handled === "object" ? data.handled : {},
        lastOpenedAt: typeof data.lastOpenedAt === "number" ? data.lastOpenedAt : null,
        silenceSince: typeof data.silenceSince === "number" ? data.silenceSince : null,
        niceTaps: Number(data.niceTaps) || 0,
        onboardedAt: typeof data.onboardedAt === "number" ? data.onboardedAt : null,
        setupSettled: data.setupSettled === true,
    };
}

export function pauseUntil(choice: PauseChoice, now: number) {
    if (choice === "week") return now + 7 * DAY;
    if (choice === "twoWeeks") return now + 14 * DAY;
    return null;
}

export function activePause(settings: NotificationSettings, now: number): PauseChoice {
    if (settings.pause === "forever") return "forever";
    return settings.pausedUntil != null && now < settings.pausedUntil ? settings.pause : "none";
}

function step<T>(levels: readonly T[], current: T, by: 1 | -1) {
    return levels[Math.max(0, Math.min(levels.length - 1, levels.indexOf(current) + by))];
}

function shiftLevel(settings: NotificationSettings, kind: NotificationKind, by: 1 | -1): NotificationSettings {
    if (kind === "week") return { ...settings, week: step(WEEK_LEVELS, settings.week, by) };
    if (kind === "progress") return { ...settings, progress: step(PROGRESS_LEVELS, settings.progress, by) };
    return { ...settings, [kind]: by < 0 };
}

export function showLess(settings: NotificationSettings, kind: NotificationKind): NotificationSettings {
    return {
        ...shiftLevel(settings, kind, 1),
        lessSteps: { ...settings.lessSteps, [kind]: settings.lessSteps[kind] + 1 },
    };
}

export function nice(settings: NotificationSettings, kind: NotificationKind): NotificationSettings {
    if (settings.lessSteps[kind] <= 0) return settings;
    return {
        ...shiftLevel(settings, kind, -1),
        lessSteps: { ...settings.lessSteps, [kind]: settings.lessSteps[kind] - 1 },
    };
}

export function dayKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

const monthKey = (date: Date) => dayKey(date).slice(0, 7);
const yearKey = (date: Date) => String(date.getFullYear());

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

function recurring(sources: readonly PaymentSource[]) {
    return sources.filter((source) => source.frequency !== "once" && source.days.length > 0 && source.shifts.some((shift) => shift.end > shift.start));
}

function lastWorkEnd(sources: readonly PaymentSource[], start: Date, days: number) {
    const working = recurring(sources);
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
        let latest = -1;
        for (const source of working) {
            if (!source.days.includes(day.getDay())) continue;
            for (const shift of source.shifts) if (shift.end > shift.start) latest = Math.max(latest, shift.end);
        }
        if (latest >= 0) return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, latest).getTime();
    }
    return null;
}

function total(sources: readonly PaymentSource[], period: EarningsPeriod, at: Date, firstDayOfWeek: number) {
    return sources.reduce((sum, source) => sum + earnedInPeriod(source, period, at, firstDayOfWeek), 0);
}

function spanDays(start: Date, end: Date) {
    return Math.round((end.getTime() - start.getTime()) / DAY);
}

function monthSpan(at: Date) {
    const start = new Date(at.getFullYear(), at.getMonth(), 1);
    const end = new Date(at.getFullYear(), at.getMonth() + 1, 1);
    return { start, end, days: spanDays(start, end) };
}

function yearSpan(at: Date) {
    const start = new Date(at.getFullYear(), 0, 1);
    const end = new Date(at.getFullYear() + 1, 0, 1);
    return { start, end, days: spanDays(start, end) };
}

function percentAt(sources: readonly PaymentSource[], period: "month" | "year", span: { start: Date; end: Date; days: number }, now: Date, firstDayOfWeek: number) {
    const completion = lastWorkEnd(sources, span.start, span.days);
    if (completion == null) return { percent: 0, completion: null, expected: 0, earned: 0 };
    const expected = total(sources, period, new Date(span.end.getTime() - 1), firstDayOfWeek);
    const earned = total(sources, period, now, firstDayOfWeek);
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
        for (let day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1); day >= start || dayKey(day) === dayKey(start); day = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1)) {
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
        return { kind: "year", key, year: at.getFullYear(), ...earnedAll(total(sources, "year", new Date(span.end.getTime() - 1), firstDayOfWeek)) };
    }
    return null;
}

function finalCandidate({ sources, period, settings, state, now, firstDayOfWeek }: RoutineInput): RoutineCandidate | null {
    const marks = ladder("month", settings.progress);
    if (period === "year" || !marks.includes(100)) return null;
    for (const at of [now, new Date(now.getFullYear(), now.getMonth(), 0, 12)]) {
        const span = monthSpan(at);
        const period = monthKey(at);
        const key = `progress:${period}:100`;
        if (state.sent.includes(key) || (state.handled[period] ?? 0) >= 100) continue;
        const completion = lastWorkEnd(sources, span.start, span.days);
        if (completion == null) continue;
        const since = now.getTime() - completion;
        if (since < AFTER_LAST_SHIFT || since > FINAL_DROPS_AFTER) continue;
        const amount = total(sources, "month", new Date(span.end.getTime() - 1), firstDayOfWeek);
        if (amount <= 0) continue;
        return { kind: "progress", scope: "month", key, start: span.start.getTime(), mark: 100, from: 0, marks, ...earnedAll(amount) };
    }
    return null;
}

function milestoneCandidate({ sources, period, settings, state, now, firstDayOfWeek }: RoutineInput): RoutineCandidate | null {
    const scope = period === "year" ? "year" : "month";
    const marks = ladder(period, settings.progress).filter((mark) => mark < 100);
    if (!marks.length) return null;
    const span = scope === "year" ? yearSpan(now) : monthSpan(now);
    const periodKey = scope === "year" ? yearKey(now) : monthKey(now);
    const { percent, earned, expected } = percentAt(sources, scope, span, now, firstDayOfWeek);
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
        const days = [...new Set(recurring(sources).flatMap((source) => source.days))]
            .sort((a, b) => ((a - firstDayOfWeek + 7) % 7) - ((b - firstDayOfWeek + 7) % 7));
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

export function markCrossedHandled(
    state: RoutineState,
    sources: readonly PaymentSource[],
    period: EarningsPeriod,
    now: Date,
    firstDayOfWeek: number,
): RoutineState {
    const handled = { ...state.handled };
    const scope = period === "year" ? "year" : "month";
    const span = scope === "year" ? yearSpan(now) : monthSpan(now);
    const periodKey = scope === "year" ? yearKey(now) : monthKey(now);
    const { percent } = percentAt(sources, scope, span, now, firstDayOfWeek);
    handled[periodKey] = Math.max(handled[periodKey] ?? 0, highestCrossed(scope === "year" ? YEAR_MARKS : MONTH_MARKS, percent));
    if (scope === "month") {
        const previous = monthSpan(new Date(now.getFullYear(), now.getMonth(), 0, 12));
        const completion = lastWorkEnd(sources, previous.start, previous.days);
        if (completion != null && now.getTime() - completion <= FINAL_DROPS_AFTER) handled[monthKey(previous.start)] = 100;
    }
    return { ...state, handled };
}
