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
};

export type PaymentDraft = Omit<PaymentSource, "id" | "amount"> & {
    amount: string;
};

export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FREQUENCIES: { value: Frequency; label: string }[] = [
    { value: "hour", label: "per hour" },
    { value: "week", label: "per week" },
    { value: "month", label: "per month" },
    { value: "year", label: "per year" },
    { value: "second", label: "per second" },
    { value: "once", label: "once" },
];

export const HOUR_PRESETS: { label: string; shifts: Shift[] }[] = [
    { label: "9 to 5", shifts: [{ start: 540, end: 1020 }] },
    {
        label: "9–11, then 12–5",
        shifts: [
            { start: 540, end: 660 },
            { start: 720, end: 1020 },
        ],
    },
    { label: "Mornings, 8 to 12", shifts: [{ start: 480, end: 720 }] },
    { label: "Evenings, 6 to 10", shifts: [{ start: 1080, end: 1320 }] },
];

export const INITIAL_SOURCES: PaymentSource[] = [
    {
        id: 1,
        name: "Northwind Studio",
        frequency: "month",
        amount: 5200,
        days: [1, 2, 3, 4, 5],
        shifts: [
            { start: 540, end: 660 },
            { start: 720, end: 1020 },
        ],
    },
    {
        id: 2,
        name: "Reyes Dental — night desk",
        frequency: "hour",
        amount: 34,
        days: [2, 4, 6],
        shifts: [{ start: 1080, end: 1320 }],
    },
    {
        id: 3,
        name: "Halcyon logo commission",
        frequency: "once",
        amount: 850,
        when: "today",
        days: [],
        shifts: [],
    },
];

export const EMPTY_DRAFT: PaymentDraft = {
    name: "",
    amount: "",
    frequency: "month",
    when: "today",
    days: [1, 2, 3, 4, 5],
    shifts: [{ start: 540, end: 1020 }],
};

export function formatMoney(value: number, digits = 2) {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

export function formatTime(totalMinutes: number) {
    const minutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour < 12 ? "AM" : "PM";
    const hour12 = hour % 12 || 12;
    return `${hour12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}

export function labelDays(days: number[]) {
    if (!days.length) return "no days yet";
    if (days.length === 7) return "every day";

    const sorted = [...days].sort((a, b) => a - b);
    const runs: number[][] = [];
    let current = [sorted[0]];
    for (let index = 1; index < sorted.length; index += 1) {
        if (sorted[index] === sorted[index - 1] + 1) current.push(sorted[index]);
        else {
            runs.push(current);
            current = [sorted[index]];
        }
    }
    runs.push(current);
    return runs
        .map((run) =>
            run.length > 1
                ? `${DAY_NAMES[run[0]]}–${DAY_NAMES[run.at(-1)!]}`
                : DAY_NAMES[run[0]],
        )
        .join(", ");
}

export function hoursPerDay(source: Pick<PaymentSource, "shifts">) {
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

export function sameShifts(a: Shift[], b: Shift[]) {
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
