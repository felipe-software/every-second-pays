import type { MoneyWidgetData, MoneyPaletteColors } from "react-native-noti";

import { getThemeColors, PALETTES, type Appearance } from "@/features/appearance/palettes";
import { type EarningsPeriod, type PaymentSource, PERIODS } from "@/features/earnings/model";
import type { TranslationKey } from "@/features/i18n/translations";

import { buildEarningsSchedule } from "./earnings-schedule";

const PERIOD_KEYS: Record<EarningsPeriod, TranslationKey> = {
    today: "period.today",
    week: "period.week",
    month: "period.month",
    year: "period.year",
};

function paletteColors(palette: (typeof PALETTES)[number]["id"], isDark: boolean): MoneyPaletteColors {
    const { canvas, row, ink, muted, accent, accentDeep } = getThemeColors(palette, isDark);
    return { canvas, row, ink, muted, accent, accentDeep };
}

function groupSeparator(locale: string) {
    return (1_000_000).toLocaleString(locale).replace(/\d/g, "").charAt(0);
}

export function buildWidgetData({
    sources,
    appPeriod,
    appearance,
    firstDayOfWeek,
    locale,
    decimalSeparator,
    t,
    now = new Date(),
}: {
    sources: readonly PaymentSource[];
    appPeriod: EarningsPeriod;
    appearance: Appearance;
    firstDayOfWeek: number;
    locale: string;
    decimalSeparator: string;
    t: (key: TranslationKey) => string;
    now?: Date;
}): MoneyWidgetData {
    const schedules = Object.fromEntries(
        PERIODS.map((period) => [period, buildEarningsSchedule(sources, period, now, firstDayOfWeek)]),
    ) as MoneyWidgetData["schedules"];
    const palettes = Object.fromEntries(
        PALETTES.map(({ id }) => [id, { light: paletteColors(id, false), dark: paletteColors(id, true) }]),
    );

    return {
        appPeriod,
        hasSources: sources.length > 0,
        schedules,
        appearance,
        palettes,
        format: { currency: "$", decimal: decimalSeparator, group: groupSeparator(locale), groupSize: 3 },
        labels: {
            ...Object.fromEntries(PERIODS.map((period) => [period, t(PERIOD_KEYS[period])])),
            rate: t("widgets.rateCaption"),
            idle: t("widgets.idleCaption"),
            empty: t("widgets.emptyCaption"),
        },
    };
}
