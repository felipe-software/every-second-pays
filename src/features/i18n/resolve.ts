import { firstDayOfWeek as resolveFirstDayOfWeek } from "./first-day-of-week";
import type { Language } from "./translations";

export type Replacements = Record<string, string | number>;

type LocaleInfo = {
    languageCode?: string | null;
    languageTag?: string | null;
    regionCode?: string | null;
    decimalSeparator?: string | null;
};
type CalendarInfo = { firstWeekday?: number | null };

const DEFAULT_LOCALES: Record<Language, string> = {
    en: "en-US",
    pt: "pt-BR",
    es: "es-ES",
    fr: "fr-FR",
};

function resolveLanguage(languageCode: string | null | undefined): Language {
    return languageCode === "pt" || languageCode === "es" || languageCode === "fr" ? languageCode : "en";
}

export function interpolate(value: string, replacements?: Replacements) {
    if (!replacements) return value;
    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        replacements[key] === undefined ? match : String(replacements[key]),
    );
}

export function resolveLocale(preference: "system" | Language, locales: readonly LocaleInfo[], calendars: readonly CalendarInfo[]) {
    const preferredLocale = locales.find((item) => preference === "system"
        ? item.languageCode && ["en", "pt", "es", "fr"].includes(item.languageCode)
        : item.languageCode === preference);
    const language = preference === "system" ? resolveLanguage(preferredLocale?.languageCode) : preference;
    const locale = preferredLocale?.languageTag ?? DEFAULT_LOCALES[language];
    const firstDayOfWeek = resolveFirstDayOfWeek(
        language,
        calendars[0]?.firstWeekday,
        preferredLocale?.regionCode ?? locale.split("-").at(-1),
    );
    const decimalSeparator = preferredLocale?.decimalSeparator
        ?? (1.1).toLocaleString(locale, { useGrouping: false }).replace(/[0-9]/g, "");
    return { language, locale, firstDayOfWeek, decimalSeparator };
}
