import { useEffect, useMemo } from "react";

import type { PaymentSource } from "@/features/earnings/model";

import { convertible, sourceCurrency, toMainCurrency } from "./rates";
import { useCurrencyStore } from "./store";

export function useMainCurrencySources(sources: readonly PaymentSource[]) {
    const main = useCurrencyStore((state) => state.main);
    const rates = useCurrencyStore((state) => state.rates);
    const needsRates = sources.some((source) => convertible(sourceCurrency(source, main), main));

    useEffect(() => {
        if (needsRates) void useCurrencyStore.getState().refreshRates();
    }, [needsRates]);

    return useMemo(() => {
        const { converted, unconverted } = toMainCurrency(sources, main, rates);
        const custom = unconverted.some((source) => !convertible(sourceCurrency(source, main), main));
        return { main, converted, unconverted, custom };
    }, [main, rates, sources]);
}
