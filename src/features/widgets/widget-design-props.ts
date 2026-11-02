import type { MoneyWidgetConfig } from "./widget-config";

export type WidgetDesignProps = {
    config: MoneyWidgetConfig;
    set: <K extends keyof MoneyWidgetConfig>(key: K) => (value: MoneyWidgetConfig[K]) => void;
};
