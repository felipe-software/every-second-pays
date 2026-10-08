import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { Noti } from "react-native-noti";

import { useAppearanceStore } from "@/features/appearance/store";
import { usePeriodStore } from "@/features/earnings/period-store";
import { useEarningsStore } from "@/features/earnings/store";
import { useI18n } from "@/features/i18n/i18n";

import { buildWidgetData } from "./widget-data";
import { useWidgetStore } from "./widget-store";

function AndroidMoneyWidgetSync() {
    const { t, locale, firstDayOfWeek, decimalSeparator } = useI18n();
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const period = usePeriodStore((state) => state.period);
    const appearance = useAppearanceStore((state) => state.appearance);
    const supported = useWidgetStore((state) => state.supported);
    const [foregrounds, setForegrounds] = useState(0);

    useEffect(() => {
        void useWidgetStore.getState().load();
        void useEarningsStore.getState().load();
        const appState = AppState.addEventListener("change", (state) => {
            if (state === "active") setForegrounds((count) => count + 1);
        });
        return () => appState.remove();
    }, []);

    useEffect(() => {
        if (!supported) return;
        const subscription = Noti.moneyWidgets.addChangeListener(() => void useWidgetStore.getState().refresh());
        return () => subscription.remove();
    }, [supported]);

    useEffect(() => {
        if (!supported || !ready) return;
        // Coalesces bursts of changes, like a theme switch updating several stores.
        const timer = setTimeout(() => {
            const data = buildWidgetData({ sources, appPeriod: period, appearance, firstDayOfWeek, locale, decimalSeparator, t });
            Noti.moneyWidgets.setData(data)
                .then(() => useWidgetStore.getState().published())
                .catch(() => {});
        }, 250);
        return () => clearTimeout(timer);
    }, [appearance, decimalSeparator, firstDayOfWeek, foregrounds, locale, period, ready, sources, supported, t]);

    return null;
}

export const MoneyWidgetSync = Platform.OS === "android" ? AndroidMoneyWidgetSync : () => null;
