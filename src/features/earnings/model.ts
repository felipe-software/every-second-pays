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
