import { afterEach, describe, expect, mock, test } from "bun:test";

const savedPreferences = new Map();
mock.module("expo-sqlite/kv-store", () => ({
    default: {
        getItem: async (key) => savedPreferences.get(key) ?? null,
        setItem: async (key, value) => {
            savedPreferences.set(key, value);
        },
    },
}));

const {
    PERIODS,
    countWeekdays,
    earnedInPeriod,
    earnedToday,
    periodStart,
} = await import("../features/earnings/model");
const { firstDayOfWeek } = await import("../features/i18n/first-day-of-week");
const { usePeriodStore } = await import("../features/earnings/period-store");

const originalTimeZone = process.env.TZ;
afterEach(() => {
    process.env.TZ = originalTimeZone;
});

const SUNDAY = 0;
const MONDAY = 1;
// $36 an hour = $0.01 a second; 9 AM–5 PM is $288 a day.
const weekdayJob = {
    id: 1,
    name: "Studio",
    frequency: "hour",
    amount: 36,
    days: [1, 2, 3, 4, 5],
    shifts: [{ start: 540, end: 1020 }],
};
const DAY_PAY = 288;

function slowEarned(source, period, now, firstDay) {
    const start = periodStart(period, now, firstDay);
    let total = earnedToday(source, now);
    for (let day = new Date(start); day.toDateString() !== now.toDateString(); day.setDate(day.getDate() + 1)) {
        if (source.days.includes(day.getDay())) total += DAY_PAY;
    }
    return total;
}

describe("periodStart", () => {
    const now = new Date(2026, 9, 7, 12, 30);

    test("starts each period at local midnight", () => {
        expect(now.getDay()).toBe(3);
        expect(periodStart("today", now, MONDAY)).toEqual(new Date(2026, 9, 7));
        expect(periodStart("month", now, MONDAY)).toEqual(new Date(2026, 9, 1));
        expect(periodStart("year", now, MONDAY)).toEqual(new Date(2026, 0, 1));
    });

    test("starts the week on the locale's first day", () => {
        expect(periodStart("week", now, MONDAY)).toEqual(new Date(2026, 9, 5));
        expect(periodStart("week", now, SUNDAY)).toEqual(new Date(2026, 9, 4));
        expect(periodStart("week", now, 6)).toEqual(new Date(2026, 9, 3));
    });

    test("a week starting today begins at today's midnight", () => {
        const sunday = new Date(2026, 9, 4, 8);
        expect(periodStart("week", sunday, SUNDAY)).toEqual(new Date(2026, 9, 4));
        expect(periodStart("week", sunday, MONDAY)).toEqual(new Date(2026, 8, 28));
    });

    test("crosses month and year boundaries", () => {
        const newYearsDay = new Date(2027, 0, 1, 10);
        expect(periodStart("week", newYearsDay, MONDAY)).toEqual(new Date(2026, 11, 28));
        expect(periodStart("month", newYearsDay, MONDAY)).toEqual(new Date(2027, 0, 1));
    });
});

describe("countWeekdays", () => {
    test("matches counting day by day", () => {
        const dayLists = [[], [0], [1, 2, 3, 4, 5], [0, 6], [0, 1, 2, 3, 4, 5, 6], [3]];
        for (const days of dayLists) {
            for (let first = 0; first < 7; first += 1) {
                for (let count = 0; count < 400; count += 1) {
                    let expected = 0;
                    for (let offset = 0; offset < count; offset += 1) {
                        if (days.includes((first + offset) % 7)) expected += 1;
                    }
                    expect(countWeekdays(days, first, count)).toBe(expected);
                }
            }
        }
    });
});

describe("earnedInPeriod", () => {
    test("today matches the live amount", () => {
        const now = new Date(2026, 9, 7, 12, 30);
        expect(earnedInPeriod(weekdayJob, "today", now, MONDAY)).toBeCloseTo(earnedToday(weekdayJob, now), 6);
        expect(earnedToday(weekdayJob, now)).toBeCloseTo(3.5 * 3600 * 0.01, 6);
    });

    test("adds every full working day before today", () => {
        const now = new Date(2026, 9, 7, 12, 30);
        const today = 3.5 * 3600 * 0.01;
        expect(earnedInPeriod(weekdayJob, "week", now, MONDAY)).toBeCloseTo(2 * DAY_PAY + today, 6);
        expect(earnedInPeriod(weekdayJob, "week", now, SUNDAY)).toBeCloseTo(2 * DAY_PAY + today, 6);
        // October 1–6, 2026: Thu, Fri, Mon, Tue are working days.
        expect(earnedInPeriod(weekdayJob, "month", now, MONDAY)).toBeCloseTo(4 * DAY_PAY + today, 6);
    });

    test("matches a day-by-day walk for every period over a year", () => {
        const jobs = [weekdayJob, { ...weekdayJob, days: [0, 6] }, { ...weekdayJob, days: [0, 1, 2, 3, 4, 5, 6] }];
        for (const job of jobs) {
            for (let day = 1; day <= 365; day += 9) {
                const now = new Date(2026, 0, day, 15, 10);
                for (const period of PERIODS) {
                    for (const firstDay of [SUNDAY, MONDAY]) {
                        expect(earnedInPeriod(job, period, now, firstDay)).toBeCloseTo(slowEarned(job, period, now, firstDay), 6);
                    }
                }
            }
        }
    });

    test("counts whole days across daylight saving changes", () => {
        process.env.TZ = "America/New_York";
        // DST started March 8, 2026 (a 23-hour Sunday) and ends November 1 (a 25-hour Sunday).
        const afterSpring = new Date(2026, 2, 12, 9);
        const afterFall = new Date(2026, 10, 5, 9);
        expect(earnedInPeriod(weekdayJob, "month", afterSpring, MONDAY)).toBeCloseTo(slowEarned(weekdayJob, "month", afterSpring, MONDAY), 6);
        expect(earnedInPeriod(weekdayJob, "year", afterSpring, MONDAY)).toBeCloseTo(slowEarned(weekdayJob, "year", afterSpring, MONDAY), 6);
        expect(earnedInPeriod(weekdayJob, "week", afterFall, SUNDAY)).toBeCloseTo(slowEarned(weekdayJob, "week", afterFall, SUNDAY), 6);
        expect(earnedInPeriod(weekdayJob, "year", afterFall, MONDAY)).toBeCloseTo(slowEarned(weekdayJob, "year", afterFall, MONDAY), 6);
        // Thursday after the fall change: Mon, Tue, Wed are done.
        expect(earnedInPeriod(weekdayJob, "week", afterFall, MONDAY)).toBeCloseTo(3 * DAY_PAY, 6);
    });

    test("one-time payments count in periods that include when they landed", () => {
        const now = new Date(2026, 9, 7, 12, 30);
        const bonus = { id: 2, name: "Bonus", frequency: "once", amount: 500, when: "today", days: [], shifts: [] };
        const landedMonday = { ...bonus, paidAt: new Date(2026, 9, 5, 18).getTime() };

        expect(earnedInPeriod(landedMonday, "today", now, MONDAY)).toBe(0);
        expect(earnedInPeriod(landedMonday, "week", now, MONDAY)).toBe(500);
        expect(earnedInPeriod(landedMonday, "month", now, MONDAY)).toBe(500);
        expect(earnedInPeriod(landedMonday, "year", now, MONDAY)).toBe(500);

        const landedLastYear = { ...bonus, paidAt: new Date(2025, 11, 31, 23, 59).getTime() };
        expect(PERIODS.map((period) => earnedInPeriod(landedLastYear, period, now, MONDAY))).toEqual([0, 0, 0, 0]);

        expect(PERIODS.map((period) => earnedInPeriod(bonus, period, now, MONDAY))).toEqual([500, 500, 500, 500]);
        expect(PERIODS.map((period) => earnedInPeriod({ ...bonus, when: "later" }, period, now, MONDAY))).toEqual([0, 0, 0, 0]);
    });
});

describe("firstDayOfWeek", () => {
    test("Portuguese always starts on Monday", () => {
        expect(firstDayOfWeek("pt", 1, "BR")).toBe(MONDAY);
        expect(firstDayOfWeek("pt", null, "BR")).toBe(MONDAY);
    });

    test("follows the device calendar, then the region", () => {
        expect(firstDayOfWeek("en", 1, "GB")).toBe(SUNDAY);
        expect(firstDayOfWeek("en", 2, "US")).toBe(MONDAY);
        expect(firstDayOfWeek("en", null, "US")).toBe(SUNDAY);
        expect(firstDayOfWeek("fr", null, "FR")).toBe(MONDAY);
        expect(firstDayOfWeek("en", null, "AE")).toBe(6);
        expect(firstDayOfWeek("es", undefined, undefined)).toBe(MONDAY);
    });
});

describe("period store", () => {
    const period = () => usePeriodStore.getState().period;

    test("tapping cycles through every period and wraps back to today", () => {
        usePeriodStore.setState({ period: "today" });
        const seen = PERIODS.map(() => {
            usePeriodStore.getState().cycle();
            return period();
        });
        expect(seen).toEqual(["week", "month", "year", "today"]);
    });

    test("swiping steps one period at a time and stops at both ends", () => {
        const { step } = usePeriodStore.getState();
        usePeriodStore.setState({ period: "today" });
        expect(step(-1)).toBe(false);
        expect(period()).toBe("today");
        expect([step(1), step(1), step(1)]).toEqual([true, true, true]);
        expect(period()).toBe("year");
        expect(step(1)).toBe(false);
        expect(period()).toBe("year");
        expect(step(-1)).toBe(true);
        expect(period()).toBe("month");
    });

    test("remembers the choice and restores it on the next launch", async () => {
        usePeriodStore.setState({ period: "today", hydrated: false });
        usePeriodStore.getState().select("month");
        usePeriodStore.setState({ period: "today", hydrated: false });
        await usePeriodStore.getState().load();
        expect(period()).toBe("month");
    });
});
