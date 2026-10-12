import { beforeEach, expect, mock, test } from "bun:test";

const saved = new Map();
let failRead = false;
mock.module("expo-sqlite/kv-store", () => ({
    default: {
        getItem: async (key) => {
            if (failRead) throw new Error("read failed");
            return saved.get(key) ?? null;
        },
        setItem: async (key, value) => {
            saved.set(key, value);
        },
    },
}));
mock.module("expo-localization", () => ({
    getLocales: () => [{ languageCode: "pt", languageTag: "pt-BR", currencyCode: "BRL" }],
    useLocales: () => [],
    useCalendars: () => [],
}));

const { currencyPrefix, deviceCurrency, isCurrency, resolveCurrency } = await import("../features/currency/currencies");
const { convert, fetchRates, parseRates, toMainCurrency } = await import("../features/currency/rates");
const { useCurrencyStore: store } = await import("../features/currency/store");
const { earnedInPeriod } = await import("../features/earnings/model");

const rates = { date: "2026-10-07", fetchedAt: 0, perDollar: { USD: 1, EUR: 0.8, BRL: 5 } };
const job = (fields) => ({ id: 1, name: "Job", frequency: "hour", amount: 36, days: [1, 2, 3, 4, 5], shifts: [{ start: 540, end: 1020 }], ...fields });

beforeEach(() => {
    saved.clear();
    failRead = false;
    store.setState({ main: "BRL", hydrated: false, loading: false, saving: false, loadError: false, rates: undefined, fetchingRates: false, ratesError: false, lastRatesAttempt: 0 });
});

test("prefixes keep letter symbols off the digits", () => {
    expect(currencyPrefix("USD")).toBe("$");
    expect(currencyPrefix("BRL")).toBe("R$");
    expect(currencyPrefix("CHF")).toBe("CHF ");
    expect(currencyPrefix("PLN")).toBe("zł ");
    expect(deviceCurrency("eur")).toBe("EUR");
    expect(deviceCurrency("XYZ")).toBe("USD");
    expect(deviceCurrency(null)).toBe("USD");
});

test("typed symbols resolve to known currencies or stay custom", () => {
    expect(resolveCurrency(" chf ")).toBe("CHF");
    expect(resolveCurrency("r$")).toBe("BRL");
    expect(resolveCurrency("€")).toBe("EUR");
    expect(resolveCurrency("₿")).toBe("₿");
    expect(resolveCurrency("kr")).toBe("kr");
    expect(resolveCurrency("   ")).toBeUndefined();
    expect(resolveCurrency("ABCDEFGH")).toBe("ABCDEF");
    expect(currencyPrefix("₿")).toBe("₿");
    expect(currencyPrefix("kr")).toBe("kr ");
    expect(isCurrency("₿")).toBe(true);
    expect(isCurrency("")).toBe(false);
    expect(isCurrency(" kr")).toBe(false);
    expect(isCurrency("1234567")).toBe(false);
});

test("custom symbols only match themselves", () => {
    expect(convert(10, "₿", "₿", undefined)).toBe(10);
    expect(convert(10, "₿", "USD", rates)).toBeUndefined();
    expect(convert(10, "USD", "kr", rates)).toBeUndefined();
    const { converted, unconverted } = toMainCurrency([job({ id: 1, currency: "kr" }), job({ id: 2, currency: "₿" })], "kr", rates);
    expect(converted.map((source) => source.id)).toEqual([1]);
    expect(unconverted.map((source) => source.id)).toEqual([2]);
});

test("converts through the dollar and waits for missing rates", () => {
    expect(convert(100, "EUR", "EUR", undefined)).toBe(100);
    expect(convert(80, "EUR", "BRL", rates)).toBeCloseTo(500);
    expect(convert(10, "USD", "EUR", rates)).toBeCloseTo(8);
    expect(convert(10, "GBP", "USD", rates)).toBeUndefined();
    expect(convert(10, "GBP", "USD", undefined)).toBeUndefined();
});

test("restates sources in the main currency, legacy ones included", () => {
    const sources = [job({ id: 1, currency: "EUR", amount: 8 }), job({ id: 2 }), job({ id: 3, currency: "GBP" })];
    const { converted, unconverted } = toMainCurrency(sources, "BRL", rates);
    expect(converted.map((source) => [source.id, source.currency, source.amount])).toEqual([[1, "BRL", 50], [2, undefined, 36]]);
    expect(unconverted.map((source) => source.id)).toEqual([3]);

    // Converting the amount converts the earnings too.
    const now = new Date(2026, 9, 7, 13);
    expect(earnedInPeriod(converted[0], "week", now, 1)).toBeCloseTo(earnedInPeriod(sources[0], "week", now, 1) / 0.8 * 5);
});

test("parses the API response and the cached shape alike", () => {
    const api = { date: "2026-10-07", usd: { eur: 0.85, brl: 5.4, btc: 0.00001, gbp: "bad" } };
    const parsed = parseRates(api, 42);
    expect(parsed).toEqual({ date: "2026-10-07", fetchedAt: 42, perDollar: { USD: 1, EUR: 0.85, BRL: 5.4 } });
    expect(parseRates(JSON.parse(JSON.stringify(parsed)), 99)).toEqual(parsed);
    expect(parseRates({ usd: {} }, 0)).toBeUndefined();
    expect(parseRates(null, 0)).toBeUndefined();
});

test("falls back to the mirror when the first host fails", async () => {
    const urls = [];
    const result = await fetchRates(async (url) => {
        urls.push(url);
        if (urls.length === 1) return { ok: false, status: 503 };
        return { ok: true, json: async () => ({ date: "2026-10-07", usd: { eur: 0.9 } }) };
    });
    expect(urls).toHaveLength(2);
    expect(result.perDollar.EUR).toBe(0.9);
    await expect(fetchRates(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
});

test("main currency defaults to the device's and survives rehydration", async () => {
    await store.getState().load();
    expect(store.getState().main).toBe("BRL");
    await store.getState().update("EUR");
    store.setState({ hydrated: false, main: "USD" });
    await store.getState().load();
    expect(store.getState().main).toBe("EUR");

    await store.getState().update("₿");
    store.setState({ hydrated: false, main: "USD" });
    await store.getState().load();
    expect(store.getState().main).toBe("₿");
    await expect(store.getState().update("")).rejects.toThrow();
});

test("cached rates load with the preference and fresh ones aren't refetched", async () => {
    saved.set("exchange-rates", JSON.stringify({ ...rates, fetchedAt: Date.now() }));
    await store.getState().load();
    expect(store.getState().rates.perDollar.EUR).toBe(0.8);
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
        calls += 1;
        return { ok: true, json: async () => ({ date: "2026-10-08", usd: { eur: 0.9 } }) };
    };
    try {
        await store.getState().refreshRates();
        expect(calls).toBe(0);
        await store.getState().refreshRates({ force: true });
        expect(calls).toBe(1);
        expect(store.getState().rates.perDollar.EUR).toBe(0.9);
        expect(JSON.parse(saved.get("exchange-rates")).date).toBe("2026-10-08");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("a failed preference read blocks changes until retried", async () => {
    failRead = true;
    await store.getState().load();
    expect(store.getState().loadError).toBe(true);
    await expect(store.getState().update("EUR")).rejects.toThrow();
    failRead = false;
    await store.getState().load();
    await store.getState().update("EUR");
    expect(store.getState().main).toBe("EUR");
});
