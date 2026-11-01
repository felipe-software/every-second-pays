import { getCalendars, getLocales } from "expo-localization";
import { AppState } from "react-native";
import { Noti } from "react-native-noti";

import { parseAppearance } from "@/features/appearance/palettes";
import { toMainCurrency } from "@/features/currency/rates";
import { readSavedCurrency } from "@/features/currency/store";
import { loadAppearancePreference, loadPaymentSources } from "@/features/earnings/database";
import { readSavedPeriod } from "@/features/earnings/period-store";
import { interpolate, resolveLocale } from "@/features/i18n/resolve";
import { readLanguagePreference } from "@/features/i18n/store";
import { translations } from "@/features/i18n/translations";

import { billChannels, buildBillNotification, type Translate } from "./content";
import { nextNotification, nice, type NotificationKind, type NotificationSettings, recordSent, showLess } from "./routine";
import { readSettings, readState, updateState, writeSettings } from "./storage";

const KINDS: readonly NotificationKind[] = ["week", "progress", "year", "meter"];

async function loadEnvironment() {
    const [preference, currency, period, appearance, sources] = await Promise.all([
        readLanguagePreference(),
        readSavedCurrency(),
        readSavedPeriod(),
        loadAppearancePreference(),
        loadPaymentSources(),
    ]);
    const { language, locale, firstDayOfWeek } = resolveLocale(preference, getLocales(), getCalendars());
    const t: Translate = (key, replacements) => interpolate(translations[language][key], replacements);
    return {
        t,
        locale,
        firstDayOfWeek,
        period,
        currency: currency.main,
        appearance: parseAppearance(appearance),
        sources: toMainCurrency(sources, currency.main, currency.rates).converted,
    };
}

export async function applyPendingFeedback(): Promise<NotificationSettings | null> {
    const feedback = await Noti.bills.drainFeedback();
    if (!feedback.length) return null;
    let settings = await readSettings();
    let niceTaps = 0;
    for (const { kind, action } of feedback) {
        const known = KINDS.find((item) => item === kind);
        if (!known) continue;
        if (action === "less") settings = showLess(settings, known);
        if (action === "nice") {
            settings = nice(settings, known);
            niceTaps += 1;
        }
    }
    await writeSettings(settings);
    if (niceTaps) await updateState((state) => ({ ...state, niceTaps: state.niceTaps + niceTaps }));
    return settings;
}

export async function runRoutine() {
    await applyPendingFeedback();
    if (AppState.currentState === "active") return;
    const [settings, state, environment] = await Promise.all([readSettings(), readState(), loadEnvironment()]);
    const now = new Date();
    const candidate = nextNotification({
        sources: environment.sources,
        period: environment.period,
        settings,
        state,
        now,
        firstDayOfWeek: environment.firstDayOfWeek,
    });
    if (!candidate) return;
    await Noti.bills.ensureChannels(billChannels(environment.t));
    const posted = await Noti.bills.post(buildBillNotification(candidate, {
        t: environment.t,
        locale: environment.locale,
        currency: environment.currency,
        showAmounts: settings.showAmounts,
        appearance: environment.appearance,
    }));
    if (posted) await updateState((current) => recordSent(current, candidate, now));
}
