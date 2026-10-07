import { afterEach, describe, expect, test } from "bun:test";

const { PERIODS, earnedInPeriod } = await import("../features/earnings/model");
const { buildEarningsSchedule, scheduleValueAt } = await import("../features/widgets/earnings-schedule");

const originalTimeZone = process.env.TZ;
afterEach(() => {
    process.env.TZ = originalTimeZone;
});

const MONDAY = 1;
const sources = [
    // $36 an hour = 1 cent a second, 9 AM–5 PM on weekdays.
    { id: 1, name: "Studio", frequency: "hour", amount: 36, days: [1, 2, 3, 4, 5], shifts: [{ start: 540, end: 1020 }] },
    // A split day, every day, paid monthly.
    {
        id: 2,
        name: "Agency",
        frequency: "month",
        amount: 4200,
        days: [0, 1, 2, 3, 4, 5, 6],
        shifts: [{ start: 480, end: 720 }, { start: 780, end: 1080 }],
    },
    // Overnight-ish: ends at midnight.
    { id: 3, name: "Night", frequency: "hour", amount: 20, days: [5, 6], shifts: [{ start: 1200, end: 1440 }] },
    // Landed in the past, and a scheduled one that never counts.
    { id: 4, name: "Bonus", frequency: "once", amount: 150, days: [], shifts: [], when: "today", paidAt: Date.UTC(2026, 9, 5, 12) },
    { id: 5, name: "Later", frequency: "once", amount: 900, days: [], shifts: [], when: "later" },
];

function expected(period, time) {
    return sources.reduce((sum, source) => sum + earnedInPeriod(source, period, new Date(time), MONDAY), 0) * 100;
}

describe("earnings schedule", () => {
    for (const timeZone of ["UTC", "America/New_York", "America/Sao_Paulo"]) {
        test(`matches the earnings model at any instant (${timeZone})`, () => {
            process.env.TZ = timeZone;
            // Spans the US DST change on 2026-11-01 and a month and week boundary.
            const now = new Date(2026, 9, 27, 10, 17, 23, 400);
            for (const period of PERIODS) {
                // Built past the sampled range: after the horizon the schedule stops counting on purpose.
                const schedule = buildEarningsSchedule(sources, period, now, MONDAY, 12 * 86_400_000);
                for (let step = 0; step < 4000; step += 1) {
                    // The model counts whole seconds.
                    const time = Math.floor((now.getTime() + (step * 10 * 86_400_000) / 4000 + (step % 7) * 977) / 1000) * 1000;
                    expect(scheduleValueAt(schedule, time)).toBeCloseTo(expected(period, time), 4);
                }
            }
        });
    }

    test("is sorted and stops counting at the horizon", () => {
        process.env.TZ = "UTC";
        const now = new Date(2026, 9, 6, 9, 30);
        const schedule = buildEarningsSchedule(sources, "today", now, MONDAY, 3 * 86_400_000);
        expect(schedule[0][0]).toBe(Math.floor(now.getTime() / 1000) * 1000);
        for (let index = 1; index < schedule.length; index += 1) expect(schedule[index][0]).toBeGreaterThan(schedule[index - 1][0]);
        expect(schedule.at(-1)[2]).toBe(0);
        expect(schedule.at(-1)[0]).toBeLessThanOrEqual(now.getTime() + 3 * 86_400_000);
    });

    test("drops breakpoints that continue the previous segment", () => {
        process.env.TZ = "UTC";
        const allDay = [{ id: 1, name: "Always", frequency: "second", amount: 1, days: [0, 1, 2, 3, 4, 5, 6], shifts: [{ start: 0, end: 1440 }] }];
        const now = new Date(2026, 9, 6, 9, 30);
        const schedule = buildEarningsSchedule(allDay, "year", now, MONDAY, 5 * 86_400_000);
        // Midnights don't reset a yearly total and the rate never changes: only the ends remain.
        expect(schedule.length).toBe(2);
        expect(schedule[0][2]).toBeCloseTo(0.1, 10);
    });

    test("resets at the start of each period", () => {
        process.env.TZ = "UTC";
        const now = new Date(2026, 9, 6, 16, 0);
        const schedule = buildEarningsSchedule(sources.slice(0, 1), "today", now, MONDAY, 86_400_000);
        expect(scheduleValueAt(schedule, new Date(2026, 9, 6, 23, 59).getTime())).toBeCloseTo(28_800, 4);
        expect(scheduleValueAt(schedule, new Date(2026, 9, 7, 0, 0).getTime())).toBe(0);
    });
});
