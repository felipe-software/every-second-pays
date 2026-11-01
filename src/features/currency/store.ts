import { getLocales } from "expo-localization";
import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { type Currency, deviceCurrency, isCurrency } from "./currencies";
import { type ExchangeRates, fetchRates, parseRates } from "./rates";

const MAIN_KEY = "main-currency";
const RATES_KEY = "exchange-rates";
const RATES_FRESH_FOR = 6 * 3_600_000;
const RETRY_AFTER = 60_000;

type CurrencyState = {
    main: Currency;
    hydrated: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    rates?: ExchangeRates;
    fetchingRates: boolean;
    ratesError: boolean;
    lastRatesAttempt: number;
    load: () => Promise<void>;
    update: (main: Currency) => Promise<void>;
    refreshRates: (options?: { force?: boolean }) => Promise<void>;
};

export function regionCurrency() {
    try {
        return deviceCurrency(getLocales()[0]?.currencyCode);
    } catch {
        return deviceCurrency(undefined);
    }
}

export async function readSavedCurrency() {
    const [main, cachedRates] = await Promise.all([Storage.getItem(MAIN_KEY), Storage.getItem(RATES_KEY)]);
    let rates: ExchangeRates | undefined;
    try {
        rates = cachedRates ? parseRates(JSON.parse(cachedRates), 0) : undefined;
    } catch {
    }
    return { main: isCurrency(main) ? main : regionCurrency(), rates };
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
    main: regionCurrency(),
    hydrated: false,
    loading: false,
    saving: false,
    loadError: false,
    rates: undefined,
    fetchingRates: false,
    ratesError: false,
    lastRatesAttempt: 0,
    load: async () => {
        if (get().loading || (get().hydrated && !get().loadError)) return;
        set({ loading: true, loadError: false });
        try {
            const { main, rates } = await readSavedCurrency();
            set({ main, rates: rates ?? get().rates });
        } catch {
            set({ loadError: true });
        } finally {
            set({ hydrated: true, loading: false });
        }
    },
    update: async (main) => {
        if (!get().hydrated || get().loading || get().loadError || get().saving) {
            throw new Error("Currency preference unavailable.");
        }
        const previous = get().main;
        if (main === previous) return;
        if (!isCurrency(main)) throw new Error("Unknown currency.");
        set({ main, saving: true });
        try {
            await Storage.setItem(MAIN_KEY, main);
        } catch (error) {
            set({ main: previous });
            throw error;
        } finally {
            set({ saving: false });
        }
    },
    refreshRates: async ({ force = false } = {}) => {
        const { fetchingRates, rates, lastRatesAttempt } = get();
        if (fetchingRates) return;
        if (!force && rates && Date.now() - rates.fetchedAt < RATES_FRESH_FOR) return;
        if (!force && Date.now() - lastRatesAttempt < RETRY_AFTER) return;
        set({ fetchingRates: true, lastRatesAttempt: Date.now() });
        try {
            const next = await fetchRates();
            set({ rates: next, ratesError: false });
            Storage.setItem(RATES_KEY, JSON.stringify(next)).catch(() => {});
        } catch {
            set({ ratesError: true });
        } finally {
            set({ fetchingRates: false });
        }
    },
}));
