import { beforeEach, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let locales;
let calendars;
const savedPreferences = new Map();
let failRead = false;
let failWrite = false;
let holdWrite = false;
let releaseWrite;
mock.module("expo-sqlite/kv-store", () => ({
    default: {
        getItem: async (key) => {
            if (failRead) throw new Error("read failed");
            return savedPreferences.get(key) ?? null;
        },
        setItem: async (key, value) => {
            if (holdWrite) await new Promise((resolve) => { releaseWrite = resolve; });
            if (failWrite) throw new Error("write failed");
            savedPreferences.set(key, value);
        },
    },
}));
mock.module("expo-localization", () => ({
    useLocales: () => locales,
    useCalendars: () => calendars,
}));

const { I18nProvider, useI18n } = await import("../features/i18n/i18n");
const { translations } = await import("../features/i18n/translations");
const { useLanguageStore: languageStore } = await import("../features/i18n/store");
const initialLanguageState = languageStore.getInitialState();
const resetLanguage = () => languageStore.setState({ preference: "system", hydrated: false, loading: false, saving: false, loadError: false });

function readI18n() {
    // The server renderer reads Zustand's initial snapshot instead of its live subscription.
    Object.assign(initialLanguageState, languageStore.getState());
    let value;
    function Probe() {
        value = useI18n();
        return null;
    }
    renderToStaticMarkup(createElement(I18nProvider, null, createElement(Probe)));
    return value;
}

beforeEach(() => {
    locales = [{ languageCode: "en", languageTag: "en-US", decimalSeparator: "." }];
    calendars = [{ uses24hourClock: true }];
    failRead = false;
    failWrite = false;
    holdWrite = false;
    releaseWrite = undefined;
    savedPreferences.clear();
    resetLanguage();
});

test("manual language overrides the device and survives rehydration", async () => {
    await languageStore.getState().load();
    for (const preference of ["pt", "es", "fr", "en"]) {
        await languageStore.getState().update(preference);
        expect(readI18n().language).toBe(preference);
        expect(readI18n().t("settings.language")).toBe(translations[preference]["settings.language"]);
        resetLanguage();
        await languageStore.getState().load();
        expect(readI18n().language).toBe(preference);
    }
    locales = [{ languageCode: "pt", languageTag: "pt-BR", decimalSeparator: "," }];
    await languageStore.getState().update("system");
    expect(readI18n().language).toBe("pt");
    resetLanguage();
    await languageStore.getState().load();
    expect(languageStore.getState().preference).toBe("system");
});

test("applies a language immediately while persistence is pending", async () => {
    await languageStore.getState().load();
    holdWrite = true;

    const update = languageStore.getState().update("pt");
    expect(languageStore.getState()).toMatchObject({ preference: "pt", saving: true });
    expect(readI18n().language).toBe("pt");

    releaseWrite();
    await update;
    expect(languageStore.getState().saving).toBe(false);

    resetLanguage();
    await languageStore.getState().load();
    expect(languageStore.getState().preference).toBe("pt");
});

test("does not persist an unchanged language", async () => {
    await languageStore.getState().load();
    await languageStore.getState().update("system");
    expect(savedPreferences.has("language")).toBe(false);
    expect(languageStore.getState().saving).toBe(false);
});

test("manual language without a native locale keeps Hermes-compatible decimal formatting", async () => {
    await languageStore.getState().load();
    await languageStore.getState().update("fr");
    const original = Intl.NumberFormat.prototype.formatToParts;
    Intl.NumberFormat.prototype.formatToParts = undefined;
    try {
        expect(readI18n().decimalSeparator).toBe(",");
        expect(readI18n().formatMoney(12.5)).toBe("12,50");
    } finally {
        Intl.NumberFormat.prototype.formatToParts = original;
    }
});

test("language storage failures are retryable and preserve the saved preference", async () => {
    savedPreferences.set("language", "pt");
    failRead = true;
    await languageStore.getState().load();
    expect(languageStore.getState()).toMatchObject({ hydrated: true, loadError: true });
    await expect(languageStore.getState().update("fr")).rejects.toThrow();
    failRead = false;
    await languageStore.getState().load();
    expect(languageStore.getState().preference).toBe("pt");
    failWrite = true;
    await expect(languageStore.getState().update("fr")).rejects.toThrow();
    expect(languageStore.getState()).toMatchObject({ preference: "pt", saving: false });
    resetLanguage();
    await languageStore.getState().load();
    expect(languageStore.getState().preference).toBe("pt");
});

test("unknown saved language falls back to the device", async () => {
    savedPreferences.set("language", "invalid");
    await languageStore.getState().load();
    expect(languageStore.getState().preference).toBe("system");
});

test("formats all supported languages without NumberFormat.formatToParts", () => {
    const original = Intl.NumberFormat.prototype.formatToParts;
    Intl.NumberFormat.prototype.formatToParts = undefined;
    try {
        for (const [languageCode, languageTag, decimalSeparator, expected] of [
            ["en", "en-US", ".", "1,234.56"],
            ["pt", "pt-BR", ",", "1.234,56"],
            ["es", "es-ES", ",", "1234,56"],
            ["fr", "fr-FR", ",", "1\u202f234,56"],
        ]) {
            locales = [{ languageCode, languageTag, decimalSeparator }];
            const i18n = readI18n();
            expect(i18n.language).toBe(languageCode);
            expect(i18n.decimalSeparator).toBe(decimalSeparator);
            expect(i18n.formatMoney(1234.56)).toBe(expected);
            expect(i18n.formatMoney(0.0012, 4)).toBe(`0${decimalSeparator}0012`);
            expect(i18n.t("home.editSource", { name: "Acme" })).toContain("Acme");
        }
    } finally {
        Intl.NumberFormat.prototype.formatToParts = original;
    }
});

test("prefers the native decimal separator and falls back to locale formatting when null", () => {
    locales = [{ languageCode: "pt", languageTag: "pt-BR", decimalSeparator: "." }];
    expect(readI18n().decimalSeparator).toBe(".");
    locales[0].decimalSeparator = null;
    expect(readI18n().decimalSeparator).toBe(",");
});

test("selects the first supported language and falls back to English", () => {
    locales = [
        { languageCode: "de", languageTag: "de-DE", decimalSeparator: "," },
        { languageCode: "fr", languageTag: "fr-CA", decimalSeparator: "," },
        { languageCode: "pt", languageTag: "pt-BR", decimalSeparator: "," },
    ];
    expect(readI18n()).toMatchObject({ language: "fr", locale: "fr-CA", decimalSeparator: "," });
    locales = locales.slice(0, 1);
    expect(readI18n()).toMatchObject({ language: "en", locale: "en-US", decimalSeparator: "." });
});

test("respects 12/24-hour preferences and locale defaults when the preference is null", () => {
    locales = [{ languageCode: "pt", languageTag: "pt-BR", decimalSeparator: "," }];
    expect(readI18n().formatTime(17 * 60 + 30)).toBe("17:30");
    calendars = [{ uses24hourClock: false }];
    expect(readI18n().formatTime(17 * 60 + 30)).toMatch(/5:30.*PM/);
    calendars = [{ uses24hourClock: null }];
    expect(readI18n().formatTime(17 * 60 + 30)).toBe("17:30");
    expect(readI18n().formatTime(1440)).toBe(readI18n().formatTime(0));
});

test("formats translated empty, full and mixed weekday schedules", () => {
    locales = [{ languageCode: "pt", languageTag: "pt-BR", decimalSeparator: "," }];
    const i18n = readI18n();
    expect(i18n.formatDays([])).toBe(i18n.t("days.none"));
    expect(i18n.formatDays([0, 1, 2, 3, 4, 5, 6])).toBe(i18n.t("days.everyDay"));
    const days = [5, 2, 1];
    expect(i18n.formatDays(days)).toBe(`${i18n.weekdayName(1)}–${i18n.weekdayName(2)}, ${i18n.weekdayName(5)}`);
    expect(days).toEqual([5, 2, 1]);
});

test("translations preserve every key and interpolation placeholder", () => {
    const placeholders = (value) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    for (const table of Object.values(translations)) {
        expect(Object.keys(table).sort()).toEqual(Object.keys(translations.en).sort());
        for (const [key, value] of Object.entries(translations.en)) {
            expect(table[key].trim().length).toBeGreaterThan(0);
            expect(placeholders(table[key])).toEqual(placeholders(value));
        }
    }
});
