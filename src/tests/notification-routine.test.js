import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const {
    DEFAULT_SETTINGS,
    EMPTY_STATE,
    activePause,
    earnedBetween,
    ladder,
    markCrossedHandled,
    nextNotification,
    nice,
    parseSettings,
    parseState,
    pauseUntil,
    recordSent,
    showLess,
} = await import("../features/notifications/routine");
const { buildBillNotification } = await import("../features/notifications/content");

const originalTimeZone = process.env.TZ;
beforeEach(() => {
    process.env.TZ = "America/New_York";
});
afterEach(() => {
    process.env.TZ = originalTimeZone;
});

const MONDAY = 1;
const job = { id: 1, name: "Job", frequency: "month", amount: 4000, days: [1, 2, 3, 4, 5], shifts: [{ start: 540, end: 1020 }] };
const opened = (date) => ({ ...EMPTY_STATE, lastOpenedAt: date.getTime() - 86_400_000 });
const run = (now, overrides = {}) => nextNotification({
    sources: [job],
    period: "month",
    settings: DEFAULT_SETTINGS,
    state: opened(now),
    now,
    firstDayOfWeek: MONDAY,
    ...overrides,
});

describe("progress milestones", () => {
    test("sends only the highest crossed percentage of the month", () => {
        const now = new Date(2026, 9, 16, 18);
        const candidate = run(now);
        expect(candidate.kind).toBe("progress");
        expect(candidate.key).toBe("progress:2026-10:50");
        expect(candidate.mark).toBe(50);
        expect(candidate.from).toBe(0);
        expect(candidate.marks).toEqual([25, 50, 90, 100]);
    });

    test("a milestone carries the month's expected total for the bar's labels", () => {
        const candidate = run(new Date(2026, 9, 16, 18));
        expect(candidate.goal).toBeCloseTo(4000, 0);
        expect(candidate.amount).toBeLessThan(candidate.goal);
    });

    test("percentages follow what the user earns, at any income", () => {
        const now = new Date(2026, 9, 16, 18);
        const small = run(now, { sources: [{ ...job, amount: 90 }] });
        const large = run(now, { sources: [{ ...job, amount: 250_000 }] });
        expect(small.key).toBe(large.key);
        expect(large.amount / small.amount).toBeCloseTo(250_000 / 90, 3);
    });

    test("a percentage already sent is not sent twice", () => {
        const now = new Date(2026, 9, 16, 18);
        const settings = { ...DEFAULT_SETTINGS, week: "off" };
        const state = recordSent(opened(now), run(now, { settings }), new Date(2026, 9, 15, 18));
        expect(run(now, { state, settings })).toBeNull();
    });

    test("the next block starts where the last notification stopped", () => {
        const now = new Date(2026, 9, 28, 18);
        const state = { ...opened(now), handled: { "2026-10": 50 } };
        const candidate = run(now, { state });
        expect(candidate.mark).toBe(90);
        expect(candidate.from).toBe(50);
    });

    test("a Year counter steps every 10% of the year", () => {
        const now = new Date(2026, 3, 15, 18);
        const candidate = run(now, { period: "year" });
        expect(candidate.scope).toBe("year");
        expect(candidate.key).toBe("progress:2026:20");
        expect(candidate.marks.length).toBe(10);
    });

    test("Today and Week counters use the month ladder", () => {
        const now = new Date(2026, 9, 16, 18);
        expect(run(now, { period: "today" }).key).toBe("progress:2026-10:50");
        expect(run(now, { period: "week" }).key).toBe("progress:2026-10:50");
    });

    test("the level decides which percentages exist", () => {
        expect(ladder("month", "all")).toEqual([25, 50, 90, 100]);
        expect(ladder("month", "half")).toEqual([50, 100]);
        expect(ladder("month", "final")).toEqual([100]);
        expect(ladder("month", "off")).toEqual([]);
        const now = new Date(2026, 9, 12, 18);
        expect(run(now, { settings: { ...DEFAULT_SETTINGS, progress: "final", week: "off" } })).toBeNull();
    });

    test("saving a source marks crossed percentages as handled without sending", () => {
        const now = new Date(2026, 9, 16, 18);
        const state = markCrossedHandled(opened(now), [job], "month", now, MONDAY);
        expect(state.handled["2026-10"]).toBe(50);
        expect(run(now, { state, settings: { ...DEFAULT_SETTINGS, week: "off" } })).toBeNull();
    });
});

describe("100% of the month", () => {
    test("fires 10 minutes after the last shift of the month, as a chain from zero", () => {
        const lastShift = new Date(2026, 9, 30, 17);
        expect(run(new Date(lastShift.getTime() + 5 * 60_000)).mark).not.toBe(100);
        const candidate = run(new Date(lastShift.getTime() + 11 * 60_000));
        expect(candidate.key).toBe("progress:2026-10:100");
        expect(candidate.from).toBe(0);
        expect(candidate.amount).toBeCloseTo(4000, 0);
    });

    test("still goes out in the first days of the next month", () => {
        const candidate = run(new Date(2026, 10, 2, 9));
        expect(candidate.key).toBe("progress:2026-10:100");
        expect(candidate.amount).toBeCloseTo(4000, 0);
    });

    test("is dropped once it is more than 5 days late", () => {
        const candidate = run(new Date(2026, 10, 6, 9), { settings: { ...DEFAULT_SETTINGS, week: "off" } });
        expect(candidate?.key).not.toBe("progress:2026-10:100");
    });

    test("wins over a milestone or week on the same day", () => {
        const now = new Date(2026, 9, 30, 18);
        expect(run(now).key).toBe("progress:2026-10:100");
    });
});

describe("week wrapped", () => {
    const settings = { ...DEFAULT_SETTINGS, progress: "off", year: false };

    test("follows the user's own last shift of the week", () => {
        const tuesdayToSaturday = { ...job, days: [2, 3, 4, 5, 6] };
        const friday = new Date(2026, 9, 9, 18);
        expect(run(friday, { sources: [tuesdayToSaturday], settings })).toBeNull();
        const saturday = new Date(2026, 9, 10, 17, 11);
        const candidate = run(saturday, { sources: [tuesdayToSaturday], settings });
        expect(candidate.kind).toBe("week");
        expect(candidate.key).toBe("week:2026-10-05");
        expect(candidate.days).toEqual([2, 3, 4, 5, 6]);
    });

    test("waits 10 minutes after the shift", () => {
        expect(run(new Date(2026, 9, 9, 17, 5), { settings })).toBeNull();
        expect(run(new Date(2026, 9, 9, 17, 11), { settings }).kind).toBe("week");
    });

    test("is dropped after 48 hours", () => {
        expect(run(new Date(2026, 9, 11, 16), { settings }).kind).toBe("week");
        expect(run(new Date(2026, 9, 11, 18), { settings })).toBeNull();
    });

    test("week days are ordered from the user's first day of the week", () => {
        const allWeek = { ...job, days: [0, 1, 2, 3, 4, 5, 6] };
        const candidate = run(new Date(2026, 9, 11, 18), { sources: [allWeek], settings });
        expect(candidate.days[0]).toBe(1);
        expect(candidate.days.at(-1)).toBe(0);
    });

    test("every other week skips alternating weeks", () => {
        const every = { ...settings, week: "other" };
        const results = [9, 16, 23, 30].map((day) => run(new Date(2026, 9, day, 18), { settings: every }));
        expect(results.filter(Boolean).length).toBe(2);
    });

    test("a Sunday night shift still sends after the week rolled over", () => {
        const sundays = { ...job, days: [0], shifts: [{ start: 1200, end: 1430 }] };
        const candidate = run(new Date(2026, 9, 12, 9), { sources: [sundays], settings });
        expect(candidate.key).toBe("week:2026-10-05");
    });
});

describe("year in review", () => {
    test("comes after the last shift of the year and beats everything else", () => {
        const candidate = run(new Date(2026, 11, 31, 18));
        expect(candidate.kind).toBe("year");
        expect(candidate.key).toBe("year:2026");
        expect(candidate.amount).toBeCloseTo(48_000, 0);
    });

    test("a Year counter leaves 100% to the year in review", () => {
        const settings = { ...DEFAULT_SETTINGS, year: false, week: "off", progress: "all" };
        const candidate = run(new Date(2026, 11, 28, 18), { period: "year", settings });
        expect(candidate?.mark).not.toBe(100);
    });

    test("a Year counter never gets the month's 100%", () => {
        const settings = { ...DEFAULT_SETTINGS, week: "off" };
        const candidate = run(new Date(2026, 9, 30, 18), { period: "year", settings });
        expect(candidate?.key).not.toBe("progress:2026-10:100");
        expect(candidate.key).toBe("progress:2026:80");
    });
});

describe("delivery rules", () => {
    test("holds everything during quiet hours", () => {
        expect(run(new Date(2026, 9, 16, 21))).toBeNull();
        expect(run(new Date(2026, 9, 17, 7, 59))).toBeNull();
        expect(run(new Date(2026, 9, 17, 8)).kind).toBe("progress");
    });

    test("sends at most one a day", () => {
        const now = new Date(2026, 9, 16, 18);
        const state = recordSent(opened(now), run(now), now);
        const week = { ...state, handled: {} };
        expect(run(now, { state: week })).toBeNull();
        expect(run(new Date(2026, 9, 17, 9), { state: { ...week, lastOpenedAt: now.getTime() } })).not.toBeNull();
    });

    test("stays silent while paused", () => {
        const now = new Date(2026, 9, 16, 18);
        const paused = { ...DEFAULT_SETTINGS, pause: "week", pausedUntil: pauseUntil("week", now.getTime()) };
        expect(run(now, { settings: paused })).toBeNull();
        expect(activePause(paused, now.getTime())).toBe("week");
        expect(activePause(paused, now.getTime() + 8 * 86_400_000)).toBe("none");
        expect(activePause({ ...DEFAULT_SETTINGS, pause: "forever" }, now.getTime())).toBe("forever");
    });

    test("one-off payments alone never notify", () => {
        const once = { id: 2, name: "Bonus", frequency: "once", amount: 500, days: [], shifts: [], when: "today", paidAt: Date.now() };
        expect(run(new Date(2026, 9, 16, 18), { sources: [once] })).toBeNull();
    });
});

describe("meter's still running", () => {
    const fourteenDays = 14 * 86_400_000;

    test("goes out once after 14 days without opening the app, then silence", () => {
        const now = new Date(2026, 9, 16, 18);
        const state = { ...EMPTY_STATE, lastOpenedAt: now.getTime() - fourteenDays };
        const candidate = run(now, { state });
        expect(candidate.kind).toBe("meter");
        const after = recordSent(state, candidate, now);
        expect(run(new Date(2026, 9, 19, 18), { state: after })).toBeNull();
    });

    test("nothing goes out after 14 days when the meter is off", () => {
        const now = new Date(2026, 9, 16, 18);
        const state = { ...EMPTY_STATE, lastOpenedAt: now.getTime() - fourteenDays };
        expect(run(now, { state, settings: { ...DEFAULT_SETTINGS, meter: false } })).toBeNull();
    });

    test("opening the app ends the silence", () => {
        const now = new Date(2026, 9, 16, 18);
        const silent = { ...EMPTY_STATE, lastOpenedAt: now.getTime() - fourteenDays, silenceSince: now.getTime() - fourteenDays };
        expect(run(now, { state: silent })).toBeNull();
        expect(run(now, { state: { ...silent, lastOpenedAt: now.getTime() - 3_600_000 } }).kind).toBe("progress");
    });

    test("adds up what was earned since the last open", () => {
        const from = new Date(2026, 9, 5, 9).getTime();
        const now = new Date(2026, 9, 7, 13);
        const hourly = { ...job, frequency: "hour", amount: 10 };
        expect(earnedBetween([hourly], from, now)).toBeCloseTo(80 + 80 + 40, 1);
        expect(earnedBetween([hourly], new Date(2026, 9, 7, 11).getTime(), now)).toBeCloseTo(20, 1);
    });
});

describe("Show less and Nice", () => {
    test("Show less steps each type down, then off", () => {
        let settings = DEFAULT_SETTINGS;
        settings = showLess(settings, "week");
        expect(settings.week).toBe("other");
        settings = showLess(settings, "week");
        expect(settings.week).toBe("off");
        settings = showLess(settings, "progress");
        expect(settings.progress).toBe("half");
        settings = showLess(settings, "progress");
        expect(settings.progress).toBe("final");
        settings = showLess(settings, "progress");
        expect(settings.progress).toBe("off");
        expect(showLess(settings, "year").year).toBe(false);
        expect(showLess(settings, "meter").meter).toBe(false);
    });

    test("Nice undoes one step and otherwise changes nothing", () => {
        const stepped = showLess(DEFAULT_SETTINGS, "progress");
        expect(nice(stepped, "progress").progress).toBe("all");
        expect(nice(stepped, "progress").lessSteps.progress).toBe(0);
        expect(nice(DEFAULT_SETTINGS, "progress")).toBe(DEFAULT_SETTINGS);
        expect(nice(showLess(DEFAULT_SETTINGS, "year"), "year").year).toBe(true);
    });
});

describe("saved data", () => {
    test("bad saved values fall back to defaults", () => {
        expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings({ week: "nope", progress: 3 })).toEqual(DEFAULT_SETTINGS);
        expect(parseState("x")).toEqual(EMPTY_STATE);
    });

    test("only the most recent sent keys are kept", () => {
        const now = new Date(2026, 9, 16, 18);
        let state = opened(now);
        for (let index = 0; index < 80; index += 1) state = recordSent(state, { kind: "week", key: `week:${index}`, amount: 1, start: 0, days: [] }, now);
        expect(state.sent.length).toBe(64);
        expect(state.sent.at(-1)).toBe("week:79");
    });
});

describe("Marked Bar content", () => {
    const context = (overrides = {}) => ({
        t: (key, values) => `${key}${values ? JSON.stringify(values) : ""}`,
        locale: "en-US",
        currency: "USD",
        showAmounts: true,
        appearance: { mode: "system", palette: "green" },
        ...overrides,
    });
    const progress = (mark, from, overrides = {}) => ({
        kind: "progress",
        scope: "month",
        key: "k",
        start: new Date(2026, 9, 1).getTime(),
        mark,
        from,
        marks: [25, 50, 90, 100],
        amount: 2012,
        goal: 4000,
        ...overrides,
    });
    const labels = (payload) => payload.marks.map((mark) => mark.label);

    test("marks are labelled with money from the goal", () => {
        const payload = buildBillNotification(progress(50, 25), context());
        expect(labels(payload)).toEqual(["1K", "2K", "3.6K", "4K"]);
        expect(payload.start).toBe("Oct");
        expect(payload.amount).toBe("$2,012");
        expect(payload.from).toBe(25);
        expect(payload.to).toBe(50);
        expect(payload.chain).toBe(false);
        expect(payload.period).toBe("month");
    });

    test("money labels follow the user's language", () => {
        expect(labels(buildBillNotification(progress(50, 25), context({ locale: "pt-BR" }))).map((label) => label.replace(/\s/g, " ")))
            .toEqual(["1 mil", "2 mil", "3,6 mil", "4 mil"]);
    });

    test("Show amounts off removes every money figure", () => {
        const payload = buildBillNotification(progress(50, 25), context({ showAmounts: false }));
        expect(payload.amount).toBeNull();
        expect(labels(payload)).toEqual(["25%", "50%", "90%", "100%"]);
        expect(JSON.stringify(payload)).not.toContain("4K");
    });

    test("100% runs the whole bar from zero", () => {
        const payload = buildBillNotification(progress(100, 90), context());
        expect(payload.from).toBe(0);
        expect(payload.chain).toBe(true);
        expect(payload.intensity).toBe(1);
    });

    test("a year's ten marks only label what fits", () => {
        const marks = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        const payload = buildBillNotification(progress(40, 30, { scope: "year", marks, goal: 48_000, start: new Date(2026, 0, 1).getTime() }), context());
        expect(payload.start).toBe("2026");
        expect(payload.marks.filter((mark) => mark.label).map((mark) => mark.at)).toEqual([20, 40, 60, 80, 100]);
        expect(labels(buildBillNotification(progress(10, 0, { scope: "year", marks, goal: 48_000 }), context()))[0]).toBe("4.8K");
        expect(buildBillNotification(progress(10, 0, { scope: "year", marks, goal: 48_000 }), context()).start).toBeNull();
    });

    test("week wrapped has one mark a working day and fills the last one", () => {
        const candidate = { kind: "week", key: "k", start: 0, days: [1, 2, 3, 4, 5], amount: 925, goal: 925 };
        const payload = buildBillNotification(candidate, context());
        expect(payload.marks.map((mark) => mark.at)).toEqual([20, 40, 60, 80, 100]);
        expect(labels(payload)).toEqual(["185", "370", "555", "740", "925"]);
        expect(payload.from).toBe(80);
        expect(labels(buildBillNotification(candidate, context({ showAmounts: false })))).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    });

    test("labels under 1,000 are whole numbers", () => {
        const candidate = { kind: "week", key: "k", start: 0, days: [1, 2, 3, 4, 5], amount: 909.09, goal: 909.09 };
        expect(labels(buildBillNotification(candidate, context()))).toEqual(["182", "364", "545", "727", "909"]);
    });

    test("year in review marks the quarters", () => {
        const payload = buildBillNotification({ kind: "year", key: "k", year: 2026, amount: 48_000, goal: 48_000 }, context());
        expect(labels(payload)).toEqual(["12K", "24K", "36K", "48K"]);
        expect(payload.chain).toBe(true);
    });
});
