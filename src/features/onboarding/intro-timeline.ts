// The intro's example wage: each bill is an hour of work, a day is eight of them, a month 22
// workdays, a year twelve months. The timeline below is the design's, in ms from the start.
export const HOUR_PAY = 20;
export const DAY_PAY = HOUR_PAY * 8;
export const MONTH_PAY = DAY_PAY * 22;
export const YEAR_PAY = MONTH_PAY * 12;

/** The month's workdays after its first week: 30 days from a Monday. */
export const MONTH_WORKDAYS = 17;

/** The bird swoops in, then bursts into the day's eight bills. */
export const BIRD = { at: 200, flight: 1900 } as const;
/** Each of the day's bills dives into its hour this long after the burst, 80 ms apart. */
export const DIVE = { delay: 520, gap: 80, duration: 400 } as const;

/** Weekday columns on the artboard, Monday first. */
export const WEEK = { x0: 62, dx: 48 } as const;

/** 1 the day, 2 the week, 3 the month, 4 the year. */
export type Stage = 0 | 1 | 2 | 3 | 4;
