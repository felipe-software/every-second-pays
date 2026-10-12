export const CURRENCIES = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
    { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
    { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
    { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
    { code: "COP", symbol: "CO$", name: "Colombian Peso" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
    { code: "UYU", symbol: "$U", name: "Uruguayan Peso" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "SEK", symbol: "SEK", name: "Swedish Krona" },
    { code: "NOK", symbol: "NOK", name: "Norwegian Krone" },
    { code: "DKK", symbol: "DKK", name: "Danish Krone" },
    { code: "PLN", symbol: "zł", name: "Polish Złoty" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
    { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
    { code: "RON", symbol: "lei", name: "Romanian Leu" },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
    { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
    { code: "AED", symbol: "AED", name: "UAE Dirham" },
    { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CNY", symbol: "CN¥", name: "Chinese Yuan" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
    { code: "PHP", symbol: "₱", name: "Philippine Peso" },
    { code: "THB", symbol: "฿", name: "Thai Baht" },
    { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export type Currency = CurrencyCode | (string & {});

export const POPULAR_CURRENCIES: readonly CurrencyCode[] = ["USD", "EUR", "GBP", "BRL", "CAD", "AUD", "MXN", "JPY", "CHF"];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export const CUSTOM_SYMBOL_MAX = 6;

export function isCurrencyCode(value: unknown): value is CurrencyCode {
    return CURRENCIES.some((currency) => currency.code === value);
}

export function isCurrency(value: unknown): value is Currency {
    return isCurrencyCode(value)
        || (typeof value === "string" && value.trim() === value && value.length > 0 && [...value].length <= CUSTOM_SYMBOL_MAX);
}

export function resolveCurrency(input: string): Currency | undefined {
    const text = [...input.trim()].slice(0, CUSTOM_SYMBOL_MAX).join("");
    if (!text) return undefined;
    const upper = text.toUpperCase();
    const known = CURRENCIES.find((currency) => currency.code === upper || currency.symbol.toUpperCase() === upper);
    return known?.code ?? text;
}

export function currencySymbol(currency: Currency) {
    return CURRENCIES.find((item) => item.code === currency)?.symbol ?? currency;
}

export function currencyPrefix(currency: Currency) {
    const symbol = currencySymbol(currency);
    return symbol.length > 1 && /[A-Za-zÀ-ž]$/.test(symbol) ? `${symbol} ` : symbol;
}

export function currencyName(currency: Currency, locale: string) {
    if (!isCurrencyCode(currency)) return currency;
    try {
        if (typeof Intl.DisplayNames === "function") {
            const name = new Intl.DisplayNames([locale], { type: "currency" }).of(currency);
            if (name && name !== currency) return name;
        }
    } catch {
    }
    return CURRENCIES.find((item) => item.code === currency)?.name ?? currency;
}

export function deviceCurrency(currencyCode: string | null | undefined): CurrencyCode {
    const code = currencyCode?.toUpperCase();
    return isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
}
