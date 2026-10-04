import { useCalendars, useLocales } from "expo-localization";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";

import { translations, type Language, type TranslationKey } from "./translations";
import { useLanguageStore } from "./store";

type Replacements = Record<string, string | number>;

type I18nContextValue = {
    language: Language;
    locale: string;
    decimalSeparator: string;
    t: (key: TranslationKey, replacements?: Replacements) => string;
    formatMoney: (value: number, digits?: number) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatTime: (totalMinutes: number) => string;
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
    const decimalSeparator = preferredLocale?.decimalSeparator
        ?? (1.1).toLocaleString(locale, { useGrouping: false }).replace(/[0-9]/g, "");

    const t = useCallback(
        (key: TranslationKey, replacements?: Replacements) => interpolate(translations[language][key], replacements),
        [language],
    );
    const formatNumber = useCallback(
        (value: number, options?: Intl.NumberFormatOptions) => value.toLocaleString(locale, options),
        [locale],
    );
    const formatMoney = useCallback(
        (value: number, digits = 2) => formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
        [formatNumber],
    );
    const timeParts = useCallback(
        (totalMinutes: number) => {
            const minutes = ((totalMinutes % 1440) + 1440) % 1440;
            const date = new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60);
            const formatter = new Intl.DateTimeFormat(locale, {
                hour: "numeric",
                ...(minutes % 60 ? { minute: "2-digit" as const } : {}),
                ...(uses24HourClock == null ? {} : { hour12: !uses24HourClock }),
            });
            return typeof formatter.formatToParts === "function"
                ? formatter.formatToParts(date)
                : [{ type: "literal" as const, value: formatter.format(date) }];
        },
        [locale, uses24HourClock],
    );
    const formatTime = useCallback(
        (totalMinutes: number) => timeParts(totalMinutes).map((part) => part.value).join(""),
        [timeParts],
    );
    // "9" and "11 AM" instead of "9 AM" and "11 AM": a shared day period is only written once.
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
        (day: number, width: "long" | "short" | "narrow" = "short") =>
            new Intl.DateTimeFormat(locale, { weekday: width }).format(new Date(2024, 0, 7 + day)),
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
        t,
        formatMoney,
        formatNumber,
        formatTime,
        formatTimeRange,
        formatTimeRangeParts,
        formatDays,
        weekdayName,
    }), [decimalSeparator, formatDays, formatMoney, formatNumber, formatTime, formatTimeRange, formatTimeRangeParts, language, locale, t, weekdayName]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const value = useContext(I18nContext);
    if (!value) throw new Error("useI18n must be used inside I18nProvider");
    return value;
}
