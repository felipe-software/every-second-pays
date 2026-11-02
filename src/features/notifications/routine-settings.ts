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

type StoredSettings = {
    week?: unknown;
    progress?: unknown;
    year?: unknown;
    meter?: unknown;
    showAmounts?: unknown;
    pause?: unknown;
    pausedUntil?: unknown;
    lessSteps?: unknown;
};
type StoredLessSteps = { week?: unknown; progress?: unknown; year?: unknown; meter?: unknown };
type StoredState = {
    sent?: unknown;
    lastSentDay?: unknown;
    handled?: unknown;
    lastOpenedAt?: unknown;
    silenceSince?: unknown;
    niceTaps?: unknown;
    onboardedAt?: unknown;
    setupSettled?: unknown;
};

export const DAY = 24 * 60 * 60_000;

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

const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T) =>
    allowed.find((item) => item === value) ?? fallback;

// Passed through as stored: only recordSent and markCrossedHandled ever write this map.
function isHandledMap(value: unknown): value is RoutineState["handled"] {
    return typeof value === "object" && value !== null;
}

export function parseSettings(value: unknown): NotificationSettings {
    const data: StoredSettings = typeof value === "object" && value !== null ? value : {};
    const steps: StoredLessSteps =
        typeof data.lessSteps === "object" && data.lessSteps !== null ? data.lessSteps : DEFAULT_SETTINGS.lessSteps;
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
    const data: StoredState = typeof value === "object" && value !== null ? value : {};
    return {
        sent: Array.isArray(data.sent) ? data.sent.filter((key) => typeof key === "string") : [],
        lastSentDay: typeof data.lastSentDay === "string" ? data.lastSentDay : null,
        handled: isHandledMap(data.handled) ? data.handled : {},
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
