import { type Currency, currencyPrefix } from "@/features/currency/currencies";
import type { useI18n } from "@/features/i18n/i18n";

import { type PaymentSource, type Shift, currentShift, isSameDay } from "./model";

type I18n = Pick<ReturnType<typeof useI18n>, "t" | "locale" | "formatDays" | "formatMoney" | "formatTime">;

export type SourceRowLabels = {
    active: boolean;
    subtitle: string;
    state: string;
    earned: string;
};

const landingDateFormats = new Map<string, Intl.DateTimeFormat>();

function formatLandingDate(timestamp: number, now: Date, locale: string) {
    const date = new Date(timestamp);
    const withYear = date.getFullYear() !== now.getFullYear();
    const key = `${locale}|${withYear}`;
    let format = landingDateFormats.get(key);
    if (!format) {
        const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        if (withYear) options.year = "numeric";
        format = new Intl.DateTimeFormat(locale, options);
        landingDateFormats.set(key, format);
    }
    return format.format(date);
}

function oneOffSubtitle(source: PaymentSource, now: Date, { t, locale }: I18n) {
    if (source.when !== "today") return t("home.scheduled");
    if (source.paidAt == null || isSameDay(source.paidAt, now)) return t("home.landedToday");
    return t("home.landedOn", { date: formatLandingDate(source.paidAt, now, locale) });
}

function scheduleSubtitle(source: PaymentSource, { t, formatDays, formatTime }: I18n) {
    const weekdays = source.days.length === 5 && [1, 2, 3, 4, 5].every((day) => source.days.includes(day));
    const days = weekdays ? t("home.weekdays") : formatDays(source.days);
    const shifts = source.shifts.map((item) => `${formatTime(item.start)}-${formatTime(item.end)}`).join(", ");
    return `${days} · ${shifts}`;
}

function stateLabel(source: PaymentSource, shift: Shift | undefined, { t, formatTime }: I18n) {
    if (source.frequency === "once") return t(source.when === "today" ? "home.paid" : "home.scheduled");
    if (shift) return t("home.until", { time: formatTime(shift.end) });
    return t("home.idle");
}

type SourceRowState = {
    source: PaymentSource;
    currency: Currency;
    earned: number;
    now: Date;
};

export function sourceRowLabels({ source, currency, earned, now }: SourceRowState, i18n: I18n): SourceRowLabels {
    const shift = currentShift(source, now);
    return {
        active: Boolean(shift),
        subtitle: source.frequency === "once" ? oneOffSubtitle(source, now, i18n) : scheduleSubtitle(source, i18n),
        state: stateLabel(source, shift, i18n),
        earned: `${currencyPrefix(currency)}${i18n.formatMoney(earned)}`,
    };
}
