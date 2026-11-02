import type { BillColorPair, BillMark, BillNotification, BillReminder } from "react-native-noti";

import { mixColors } from "@/features/appearance/color";
import { type Appearance, getThemeColors, type ThemeColors } from "@/features/appearance/palettes";
import { type Currency, currencyPrefix } from "@/features/currency/currencies";
import type { TranslationKey } from "@/features/i18n/translations";

import type { EarningsCandidate, RoutineCandidate } from "./routine";

type ChannelKind = RoutineCandidate["kind"];
type ProgressCandidate = Extract<EarningsCandidate, { kind: "progress" }>;
type WeekCandidate = Extract<EarningsCandidate, { kind: "week" }>;
type YearCandidate = Extract<EarningsCandidate, { kind: "year" }>;
type MeterCandidate = Extract<EarningsCandidate, { kind: "meter" }>;
type BillFields = Pick<
    BillNotification,
    "title" | "body" | "start" | "marks" | "from" | "to" | "intensity" | "chain" | "period"
>;

export type Translate = (key: TranslationKey, replacements?: Record<string, string | number>) => string;

export type ContentContext = {
    t: Translate;
    locale: string;
    currency: Currency;
    showAmounts: boolean;
    appearance: Appearance;
};

export const ADD_SOURCE_TAP = "add-source";

export const CHANNEL_IDS: Record<ChannelKind, string> = {
    week: "earnings-week",
    progress: "earnings-progress",
    year: "earnings-year",
    meter: "earnings-meter",
    setup: "earnings-setup",
};

const CHANNEL_NAMES: Record<ChannelKind, TranslationKey> = {
    week: "notifications.week",
    progress: "notifications.progress",
    year: "notifications.year",
    meter: "notifications.meter",
    setup: "notifications.setup",
};

const CHANNEL_DESCRIPTIONS: Record<ChannelKind, TranslationKey> = {
    week: "notifications.channel.week.description",
    progress: "notifications.channel.progress.description",
    year: "notifications.channel.year.description",
    meter: "notifications.channel.meter.description",
    setup: "notifications.channel.setup.description",
};

const CHANNEL_KINDS: readonly ChannelKind[] = ["week", "progress", "year", "meter", "setup"];
const QUARTERS = [25, 50, 75, 100];
const METER_MARKS = [50, 100];
const METER_WEEK = 7 * 86_400_000;
const CROWDED_MARK_COUNT = 6;

export function billChannels(t: Translate) {
    return CHANNEL_KINDS.map((kind) => ({
        id: CHANNEL_IDS[kind],
        name: t(CHANNEL_NAMES[kind]),
        description: t(CHANNEL_DESCRIPTIONS[kind]),
    }));
}

function billColors({ mode, palette }: Appearance): BillNotification["colors"] {
    const light = getThemeColors(palette, false);
    const dark = getThemeColors(palette, true);
    const pair = (read: (colors: ThemeColors) => string): BillColorPair => {
        if (mode === "light") return [read(light), read(light)];
        if (mode === "dark") return [read(dark), read(dark)];
        return [read(light), read(dark)];
    };
    return {
        canvas: pair((colors) => colors.canvas),
        track: pair((colors) => mixColors(colors.canvas, colors.track, 0.9)),
        ink: pair((colors) => colors.ink),
        muted: pair((colors) => colors.muted),
        accent: pair((colors) => colors.accent),
        deep: pair((colors) => colors.accentDeep),
    };
}

const withoutDot = (text: string) => text.replace(/\.$/, "");

function dateLabel(locale: string, time: number, options: Intl.DateTimeFormatOptions) {
    return withoutDot(new Intl.DateTimeFormat(locale, options).format(new Date(time)));
}

function money(value: number, { currency, locale }: ContentContext) {
    const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    return `${currencyPrefix(currency)}${whole}`;
}

function compactMoney(value: number, locale: string) {
    return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: value < 1000 ? 0 : 1 }).format(
        value,
    );
}

function intensity(mark: number) {
    if (mark <= 25) return 0.45;
    if (mark <= 50) return 0.62;
    return mark < 100 ? 0.82 : 1;
}

function hasRoom(at: number, current: number, count: number) {
    if (count < CROWDED_MARK_COUNT) return true;
    return at === 100 || at === current || (at % 20 === 0 && Math.abs(at - current) > 10);
}

type MoneyMarksOptions = {
    marks: readonly number[];
    goal: number;
    current: number;
    context: ContentContext;
    hidden: (at: number) => string;
};

const percentLabel = (at: number) => `${at}%`;

function moneyMarks({ marks, goal, current, context, hidden }: MoneyMarksOptions): BillMark[] {
    return marks.map((at) => {
        if (!hasRoom(at, current, marks.length)) return { at, label: null };
        return { at, label: context.showAmounts ? compactMoney((goal * at) / 100, context.locale) : hidden(at) };
    });
}

export function buildSetupReminder({ t, currency, appearance }: ContentContext): BillReminder {
    return {
        kind: "setup",
        channel: CHANNEL_IDS.setup,
        title: t("notifications.content.setup.title"),
        body: t("notifications.content.setup.body"),
        action: t("notifications.action.addSource"),
        zero: `${currencyPrefix(currency)}0`,
        colors: billColors(appearance),
        period: ADD_SOURCE_TAP,
    };
}

function progressStart(candidate: ProgressCandidate, locale: string, name: string) {
    if (candidate.scope === "year") return candidate.mark === candidate.marks[0] ? null : name;
    return dateLabel(locale, candidate.start, { month: "short" });
}

function progressFields(candidate: ProgressCandidate, context: ContentContext, amount: string): BillFields {
    const { t, locale, showAmounts } = context;
    const isYear = candidate.scope === "year";
    const chain = candidate.mark === 100;
    const name = isYear
        ? dateLabel(locale, candidate.start, { year: "numeric" })
        : dateLabel(locale, candidate.start, { month: "long" });
    return {
        title: t("notifications.content.progress.title", { percent: candidate.mark, period: name }),
        body: !showAmounts
            ? t("notifications.content.progress.hidden")
            : t(chain ? "notifications.content.progress.done" : "notifications.content.progress.body", { amount }),
        start: progressStart(candidate, locale, name),
        marks: moneyMarks({
            marks: candidate.marks,
            goal: candidate.goal,
            current: candidate.mark,
            context,
            hidden: percentLabel,
        }),
        from: chain ? 0 : candidate.from,
        to: candidate.mark,
        intensity: intensity(candidate.mark),
        chain,
        period: isYear ? "year" : "month",
    };
}

function weekFields(candidate: WeekCandidate, context: ContentContext, amount: string): BillFields {
    const { t, locale, showAmounts } = context;
    const count = candidate.days.length;
    return {
        title: t("notifications.content.week.title"),
        body: showAmounts ? t("notifications.content.week.body", { amount }) : t("notifications.content.week.hidden"),
        start: null,
        marks: moneyMarks({
            marks: candidate.days.map((_, index) => ((index + 1) / count) * 100),
            goal: candidate.goal,
            current: 100,
            context,
            hidden: (at) =>
                dateLabel(locale, new Date(2024, 0, 7 + candidate.days[Math.round((at / 100) * count) - 1]).getTime(), {
                    weekday: "short",
                }),
        }),
        from: ((count - 1) / count) * 100,
        to: 100,
        intensity: 0.6,
        chain: false,
        period: "week",
    };
}

function yearFields(candidate: YearCandidate, context: ContentContext, amount: string): BillFields {
    const { t, showAmounts } = context;
    return {
        title: t("notifications.content.year.title", { year: candidate.year }),
        body: showAmounts ? t("notifications.content.year.body", { amount }) : t("notifications.content.year.hidden"),
        start: String(candidate.year),
        marks: moneyMarks({ marks: QUARTERS, goal: candidate.goal, current: 100, context, hidden: percentLabel }),
        from: 0,
        to: 100,
        intensity: 1,
        chain: true,
        period: "year",
    };
}

function meterFields(candidate: MeterCandidate, context: ContentContext, amount: string): BillFields {
    const { t, locale, showAmounts } = context;
    return {
        title: t("notifications.content.meter.title"),
        body: showAmounts ? t("notifications.content.meter.body", { amount }) : t("notifications.content.meter.hidden"),
        start: null,
        marks: moneyMarks({
            marks: METER_MARKS,
            goal: candidate.goal,
            current: 100,
            context,
            hidden: (at) =>
                dateLabel(locale, candidate.since + (at === 50 ? 0 : METER_WEEK), { month: "short", day: "numeric" }),
        }),
        from: 0,
        to: 100,
        intensity: 0.62,
        chain: false,
        period: null,
    };
}

function billFields(candidate: EarningsCandidate, context: ContentContext, amount: string) {
    if (candidate.kind === "progress") return progressFields(candidate, context, amount);
    if (candidate.kind === "week") return weekFields(candidate, context, amount);
    if (candidate.kind === "year") return yearFields(candidate, context, amount);
    return meterFields(candidate, context, amount);
}

export function buildBillNotification(candidate: EarningsCandidate, context: ContentContext): BillNotification {
    const { t, showAmounts, appearance } = context;
    const amount = money(candidate.amount, context);
    return {
        kind: candidate.kind,
        key: candidate.key,
        channel: CHANNEL_IDS[candidate.kind],
        publicTitle: t("notifications.public.title"),
        publicBody: t("notifications.public.body"),
        amount: showAmounts ? amount : null,
        colors: billColors(appearance),
        actions: { less: t("notifications.action.less"), nice: t("notifications.action.nice") },
        ...billFields(candidate, context, amount),
    };
}
