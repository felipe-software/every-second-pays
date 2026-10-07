import type {
    MoneyWidgetBackground,
    MoneyWidgetConfig,
    MoneyWidgetEffect,
    MoneyWidgetIntensity,
    MoneyWidgetMotion,
    MoneyWidgetPalette,
    MoneyWidgetPeriod,
    MoneyWidgetTemplate,
    MoneyWidgetTheme,
} from "react-native-noti";

export type { MoneyWidget, MoneyWidgetConfig } from "react-native-noti";

export const TEMPLATES: readonly MoneyWidgetTemplate[] = ["minimal", "hero", "ledger"];
export const EFFECTS: readonly MoneyWidgetEffect[] = ["rain", "stream", "fountain", "orbit", "none"];
export const MOTIONS: readonly MoneyWidgetMotion[] = ["roll", "drop", "flip", "blur", "slot"];
export const INTENSITIES: readonly MoneyWidgetIntensity[] = ["calm", "lively", "wild"];
export const WIDGET_PERIODS: readonly MoneyWidgetPeriod[] = ["app", "today", "week", "month", "year"];
export const WIDGET_PALETTES: readonly MoneyWidgetPalette[] = ["app", "orange", "green", "blue", "rose", "lavender"];
export const WIDGET_THEMES: readonly MoneyWidgetTheme[] = ["app", "system", "light", "dark"];
export const BACKGROUNDS: readonly MoneyWidgetBackground[] = ["glow", "solid", "glass"];

export const DEFAULT_WIDGET_CONFIG: MoneyWidgetConfig = {
    template: "minimal",
    effect: "rain",
    motion: "roll",
    intensity: "lively",
    period: "app",
    palette: "app",
    theme: "app",
    background: "glow",
    cents: true,
    caption: true,
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return allowed.find((item) => item === value) ?? fallback;
}

export function parseWidgetConfig(value: unknown): MoneyWidgetConfig {
    const data = value && typeof value === "object" ? value as Partial<MoneyWidgetConfig> : {};
    return {
        template: pick(data.template, TEMPLATES, DEFAULT_WIDGET_CONFIG.template),
        effect: pick(data.effect, EFFECTS, DEFAULT_WIDGET_CONFIG.effect),
        motion: pick(data.motion, MOTIONS, DEFAULT_WIDGET_CONFIG.motion),
        intensity: pick(data.intensity, INTENSITIES, DEFAULT_WIDGET_CONFIG.intensity),
        period: pick(data.period, WIDGET_PERIODS, DEFAULT_WIDGET_CONFIG.period),
        palette: pick(data.palette, WIDGET_PALETTES, DEFAULT_WIDGET_CONFIG.palette),
        theme: pick(data.theme, WIDGET_THEMES, DEFAULT_WIDGET_CONFIG.theme),
        background: pick(data.background, BACKGROUNDS, DEFAULT_WIDGET_CONFIG.background),
        cents: typeof data.cents === "boolean" ? data.cents : DEFAULT_WIDGET_CONFIG.cents,
        caption: typeof data.caption === "boolean" ? data.caption : DEFAULT_WIDGET_CONFIG.caption,
    };
}
