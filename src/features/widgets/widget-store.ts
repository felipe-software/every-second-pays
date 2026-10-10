import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { Noti } from "react-native-noti";
import { create } from "zustand";

import { DEFAULT_WIDGET_CONFIG, type MoneyWidget, type MoneyWidgetConfig, parseWidgetConfig } from "./widget-config";

const CONFIG_KEY = "widget-draft";

const sameConfig = (a: MoneyWidgetConfig, b: MoneyWidgetConfig) => JSON.stringify(a) === JSON.stringify(b);

type WidgetState = {
    supported: boolean | null;
    pinSupported: boolean;
    widgets: MoneyWidget[];
    config: MoneyWidgetConfig;
    hydrated: boolean;
    revision: number;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    change: (change: Partial<MoneyWidgetConfig>) => void;
    pin: () => Promise<boolean>;
    published: () => void;
};

async function applyToAll(widgets: MoneyWidget[], config: MoneyWidgetConfig) {
    await Noti.moneyWidgets.setDefaultConfig(config);
    await Promise.all(widgets.filter((widget) => !sameConfig(widget.config, config))
        .map((widget) => Noti.moneyWidgets.update(widget.id, config)));
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
    supported: Platform.OS === "android" ? null : false,
    pinSupported: false,
    widgets: [],
    config: DEFAULT_WIDGET_CONFIG,
    hydrated: false,
    revision: 0,
    load: async () => {
        if (get().hydrated) return;
        set({ hydrated: true });
        let saved: MoneyWidgetConfig | null = null;
        try {
            const value = await Storage.getItem(CONFIG_KEY);
            if (value) saved = parseWidgetConfig(JSON.parse(value));
        } catch {
            // The saved design is only a convenience; start from the defaults.
        }
        try {
            const supported = await Noti.moneyWidgets.isSupported();
            set({ supported, pinSupported: supported && await Noti.moneyWidgets.isPinningSupported() });
            if (!supported) return;
            const widgets = await Noti.moneyWidgets.list();
            // Before there was one shared design, each widget had its own: keep the first one's.
            const config = saved ?? widgets[0]?.config ?? DEFAULT_WIDGET_CONFIG;
            set({ config, widgets });
            await applyToAll(widgets, config);
            await get().refresh();
        } catch {
            set({ supported: false });
        }
    },
    refresh: async () => {
        if (!get().supported) return;
        try {
            const widgets = await Noti.moneyWidgets.list();
            set({ widgets });
            // Widgets added from the launcher's picker can still carry an older design.
            if (widgets.some((widget) => !sameConfig(widget.config, get().config))) await applyToAll(widgets, get().config);
        } catch {
            // Keep the last known list.
        }
    },
    change: (change) => {
        const config = parseWidgetConfig({ ...get().config, ...change });
        if (sameConfig(config, get().config)) return;
        set({ config });
        Storage.setItem(CONFIG_KEY, JSON.stringify(config)).catch(() => {});
        if (get().supported) applyToAll(get().widgets, config).then(() => get().refresh()).catch(() => {});
    },
    pin: async () => {
        if (!get().pinSupported) return false;
        return Noti.moneyWidgets.requestPin(get().config);
    },
    published: () => set(({ revision }) => ({ revision: revision + 1 })),
}));
