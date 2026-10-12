import type { PaymentSource } from "@/features/earnings/model";

import { CURRENCIES, type Currency, type CurrencyCode, isCurrencyCode } from "./currencies";

export type ExchangeRates = {
    date: string;
    fetchedAt: number;
    perDollar: Partial<Record<CurrencyCode, number>>;
};

// Free, keyless daily rates; the second host mirrors the first.
const RATE_URLS = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
    "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
];

export function parseRates(value: unknown, fetchedAt: number): ExchangeRates | undefined {
    if (!value || typeof value !== "object") return undefined;
    const { date, usd, perDollar } = value as { date?: unknown; usd?: unknown; perDollar?: unknown };
    const table = (perDollar ?? usd) as Record<string, unknown> | undefined;
    if (typeof date !== "string" || !table || typeof table !== "object") return undefined;
    const rates: ExchangeRates["perDollar"] = { USD: 1 };
    for (const { code } of CURRENCIES) {
        const rate = table[code] ?? table[code.toLowerCase()];
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[code] = rate;
    }
    const cachedAt = (value as { fetchedAt?: unknown }).fetchedAt;
    return { date, fetchedAt: typeof cachedAt === "number" ? cachedAt : fetchedAt, perDollar: rates };
}

export async function fetchRates(fetcher: typeof fetch = fetch): Promise<ExchangeRates> {
    let lastError: unknown;
    for (const url of RATE_URLS) {
        try {
            const response = await fetcher(url);
            if (!response.ok) throw new Error(`Rates request failed with ${response.status}.`);
            const rates = parseRates(await response.json(), Date.now());
            if (rates) return rates;
            throw new Error("Rates response was malformed.");
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

export function convert(amount: number, from: Currency, to: Currency, rates: ExchangeRates | undefined) {
    if (from === to) return amount;
    if (!isCurrencyCode(from) || !isCurrencyCode(to)) return undefined;
    const fromRate = rates?.perDollar[from];
    const toRate = rates?.perDollar[to];
    if (!fromRate || !toRate) return undefined;
    return (amount / fromRate) * toRate;
}

export function sourceCurrency(source: Pick<PaymentSource, "currency">, main: Currency): Currency {
    return source.currency ?? main;
}

export function convertible(from: Currency, to: Currency) {
    return from !== to && isCurrencyCode(from) && isCurrencyCode(to);
}

export function toMainCurrency(
    sources: readonly PaymentSource[],
    main: Currency,
    rates: ExchangeRates | undefined,
) {
    const converted: PaymentSource[] = [];
    const unconverted: PaymentSource[] = [];
    for (const source of sources) {
        const currency = sourceCurrency(source, main);
        const amount = convert(source.amount, currency, main, rates);
        if (amount == null) unconverted.push(source);
        else converted.push(currency === main ? source : { ...source, amount, currency: main });
    }
    return { converted, unconverted };
}
