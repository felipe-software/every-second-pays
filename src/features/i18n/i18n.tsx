import { useCalendars, useLocales } from "expo-localization";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";

import { firstDayOfWeek as resolveFirstDayOfWeek } from "./first-day-of-week";
import { translations, type Language, type TranslationKey } from "./translations";
import { useLanguageStore } from "./store";

type Replacements = Record<string, string | number>;

type I18nContextValue = {
    language: Language;
    locale: string;
    decimalSeparator: string;
    firstDayOfWeek: number;
    t: (key: TranslationKey, replacements?: Replacements) => string;
    formatMoney: (value: number, digits?: number) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatTime: (totalMinutes: number) => string;
    formatHour: (totalMinutes: number) => string;
    formatTimeRange: (start: number, end: number, separator?: string) => string;
    formatTimeRangeParts: (start: number, end: number) => [string, string];
    formatDays: (days: number[]) => string;
    weekdayName: (day: number, width?: "long" | "short" | "narrow") => string;
};

const DEFAULT_LOCALES: Record<Language, string> = {
    en: "en-US",
    pt: "pt-BR",
    es: "es-ES",
    fr: "fr-FR",
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveLanguage(languageCode: string | null | undefined): Language {
    return languageCode === "pt" || languageCode === "es" || languageCode === "fr" ? languageCode : "en";
}

function interpolate(value: string, replacements?: Replacements) {
    if (!replacements) return value;
    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        replacements[key] === undefined ? match : String(replacements[key]),
    );
}

// Hermes builds a native ICU formatter for every Intl constructor and every `toLocaleString`
// with a locale, which costs about a millisecond each on Android; reuse them.
const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options?: Intl.NumberFormatOptions) {
    const key = options ? `${locale}|${JSON.stringify(options)}` : locale;
    let format = numberFormats.get(key);
    if (!format) {
        format = new Intl.NumberFormat(locale, options);
        numberFormats.set(key, format);
    }
    return format;
}

function memoize<Key, Value>(compute: (key: Key) => Value) {
    const results = new Map<Key, Value>();
    return (key: Key) => {
        if (results.has(key)) return results.get(key)!;
        const value = compute(key);
        results.set(key, value);
        return value;
    };
}

const clockFormats = new Map<string, (minutes: number) => Intl.DateTimeFormatPart[]>();

function clockParts(locale: string, twentyFourHour: boolean, withMinutes: boolean) {
    const key = `${locale}|${twentyFourHour}|${withMinutes}`;
    let parts = clockFormats.get(key);
    if (!parts) {
        const formatter = new Intl.DateTimeFormat(locale, {
            hour: twentyFourHour && withMinutes ? "2-digit" : "numeric",
            ...(withMinutes ? { minute: "2-digit" as const } : {}),
            ...(twentyFourHour ? { hourCycle: "h23" as const } : { hour12: true }),
        });
        parts = memoize((minutes: number) => {
            const date = new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60);
            return typeof formatter.formatToParts === "function"
                ? formatter.formatToParts(date)
                : [{ type: "literal" as const, value: formatter.format(date) }];
        });
        clockFormats.set(key, parts);
    }
    return parts;
}

const weekdayFormats = new Map<string, (day: number) => string>();

function weekdayNames(locale: string, width: "long" | "short" | "narrow") {
    const key = `${locale}|${width}`;
    let names = weekdayFormats.get(key);
    if (!names) {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: width });
        names = memoize((day: number) => formatter.format(new Date(2024, 0, 7 + day)));
        weekdayFormats.set(key, names);
    }
    return names;
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const locales = useLocales();
    const calendars = useCalendars();
    const preference = useLanguageStore((state) => state.preference);
    const preferredLocale = locales.find((item) => preference === "system"
        ? item.languageCode && ["en", "pt", "es", "fr"].includes(item.languageCode)
        : item.languageCode === preference);
    const language = preference === "system" ? resolveLanguage(preferredLocale?.languageCode) : preference;
    const locale = preferredLocale?.languageTag ?? DEFAULT_LOCALES[language];
    const uses24HourClock = calendars[0]?.uses24hourClock;
    const firstDayOfWeek = resolveFirstDayOfWeek(
        language,
        calendars[0]?.firstWeekday,
        preferredLocale?.regionCode ?? locale.split("-").at(-1),
    );
    const decimalSeparator = preferredLocale?.decimalSeparator
        ?? (1.1).toLocaleString(locale, { useGrouping: false }).replace(/[0-9]/g, "");

    const t = useCallback(
        (key: TranslationKey, replacements?: Replacements) => interpolate(translations[language][key], replacements),
        [language],
    );
    const formatNumber = useCallback(
        (value: number, options?: Intl.NumberFormatOptions) => numberFormat(locale, options).format(value),
        [locale],
    );
    const formatMoney = useCallback(
        (value: number, digits = 2) => formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
        [formatNumber],
    );
    const twentyFourHour = useMemo(
        () => uses24HourClock ?? new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 === false,
        [locale, uses24HourClock],
    );
    const timeParts = useCallback(
        (totalMinutes: number, withMinutes = true) =>
            clockParts(locale, twentyFourHour, withMinutes)(((totalMinutes % 1440) + 1440) % 1440),
        [locale, twentyFourHour],
    );
    const formatTime = useCallback(
        (totalMinutes: number) => timeParts(totalMinutes).map((part) => part.value).join(""),
        [timeParts],
    );
    const formatHour = useCallback(
        (totalMinutes: number) => timeParts(totalMinutes, false).map((part) => part.value).join(""),
        [timeParts],
    );
    const formatTimeRangeParts = useCallback(
        (start: number, end: number): [string, string] => {
            const startParts = timeParts(start);
            const endParts = timeParts(end);
            const period = (parts: Intl.DateTimeFormatPart[]) => parts.find((part) => part.type === "dayPeriod")?.value;
            const sharedPeriod = period(startParts) != null && period(startParts) === period(endParts);
            const startText = sharedPeriod
                ? startParts.filter((part) => part.type !== "dayPeriod").map((part) => part.value).join("").trim()
                : startParts.map((part) => part.value).join("");
            return [startText, endParts.map((part) => part.value).join("")];
        },
        [timeParts],
    );
    const formatTimeRange = useCallback(
        (start: number, end: number, separator = "–") => formatTimeRangeParts(start, end).join(separator),
        [formatTimeRangeParts],
    );
    const weekdayName = useCallback(
        (day: number, width: "long" | "short" | "narrow" = "short") => weekdayNames(locale, width)(day),
        [locale],
    );
    const formatDays = useCallback(
        (days: number[]) => {
            if (!days.length) return t("days.none");
            if (days.length === 7) return t("days.everyDay");
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
                .map((run) => run.length > 1
                    ? `${weekdayName(run[0])}–${weekdayName(run.at(-1)!)}`
                    : weekdayName(run[0]))
                .join(", ");
        },
        [t, weekdayName],
    );

    const value = useMemo<I18nContextValue>(() => ({
        language,
        locale,
        decimalSeparator,
        firstDayOfWeek,
        t,
        formatMoney,
        formatNumber,
        formatTime,
        formatHour,
        formatTimeRange,
        formatTimeRangeParts,
        formatDays,
        weekdayName,
    }), [decimalSeparator, firstDayOfWeek, formatDays, formatMoney, formatNumber, formatHour, formatTime, formatTimeRange, formatTimeRangeParts, language, locale, t, weekdayName]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const value = useContext(I18nContext);
    if (!value) throw new Error("useI18n must be used inside I18nProvider");
    return value;
}
