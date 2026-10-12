import type { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSheet } from "@/components/app-sheet";
import { CheckIcon } from "@/components/check-icon";
import { PopIn } from "@/components/elevated/pop-in";
import { LineIcon } from "@/components/line-icon";
import { SettingsCard, SettingsRow } from "@/components/settings-card";
import { TryAgainButton } from "@/components/try-again-button";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { type Currency, CURRENCIES, currencyName, isCurrencyCode } from "./currencies";
import { useMainCurrencySetting } from "./currency-selector";
import { regionCurrency, useCurrencyStore } from "./store";

const SEARCH_PATH = "M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13ZM16 16l4 4";
const CLEAR_PATH = "M6 6l12 12M18 6 6 18";
const PICK_SETTLE_MS = 220;

type Row = { currency: Currency; name: string; detail: string };

function CurrencyRows({ label, rows, selected, onPick }: { label: string; rows: Row[]; selected: Currency; onPick: (currency: Currency) => void }) {
    const { colors } = useEarningsTheme();
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={label}>
            <SettingsCard>
                {rows.map((row) => {
                    const checked = row.currency === selected;
                    return (
                        <SettingsRow
                            key={row.currency}
                            testID={`main-currency-${row.currency}`}
                            accessibilityRole="radio"
                            accessibilityState={{ checked }}
                            accessibilityLabel={`${row.name}, ${row.detail}`}
                            onPress={() => onPick(row.currency)}
                            minHeight={60}
                        >
                            <View className="min-w-0 flex-1 gap-0.5">
                                <Text numberOfLines={1} className="font-sans text-[15.5px] font-medium text-ink">{row.name}</Text>
                                <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted">{row.detail}</Text>
                            </View>
                            <View className="h-5 w-5 items-center justify-center">
                                <PopIn visible={checked}>
                                    <CheckIcon size={20} color={colors.accentDeep} />
                                </PopIn>
                            </View>
                        </SettingsRow>
                    );
                })}
            </SettingsCard>
        </View>
    );
}

function Heading({ children, first = false }: { children: string; first?: boolean }) {
    return (
        <Text
            accessibilityRole="header"
            className={`${first ? "mt-4" : "mt-[26px]"} mb-[9px] ml-1 font-sans text-[13px] font-semibold text-muted`}
        >
            {children}
        </Text>
    );
}

export function MainCurrencySheet({ onDismiss }: { onDismiss: () => void }) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const { t, locale } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const { main, disabled, loadError, ratesFailed, errorHint, change } = useMainCurrencySetting();
    const [query, setQuery] = useState("");
    const dismiss = () => void sheetRef.current?.dismiss().catch(() => undefined);

    const all = useMemo<Row[]>(() => CURRENCIES
        .map(({ code }) => ({ currency: code, name: currencyName(code, locale), detail: code }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)), [locale]);

    const region = regionCurrency();
    const suggested: Row[] = [...new Set<Currency>([region, main])].map((currency) => ({
        currency,
        name: currencyName(currency, locale),
        detail: currency === region ? t("currency.yourRegion", { code: currency }) : isCurrencyCode(currency) ? currency : t("currency.customTitle"),
    }));

    const search = query.trim().toLocaleLowerCase(locale);
    const results = search
        ? all.filter((row) => row.name.toLocaleLowerCase(locale).includes(search) || row.currency.toLowerCase().includes(search))
        : [];

    const pick = (currency: Currency) => {
        if (disabled) return;
        appHaptics.selection();
        if (currency !== main) void change(currency);
        setTimeout(dismiss, PICK_SETTLE_MS);
    };

    return (
        <AppSheet
            sheetRef={sheetRef}
            title={t("settings.currency")}
            closeTestID="close-main-currency-sheet"
            onDidDismiss={onDismiss}
            headerAccessory={
                <View
                    className="mx-[22px] mb-1.5 h-12 flex-row items-center gap-2.5 rounded-[16px] pr-1.5 pl-3.5"
                    style={{ backgroundColor: colors.cardFace, borderWidth: 1, borderColor: isDark ? colors.cardFace : colors.cardOutline }}
                >
                    <LineIcon d={SEARCH_PATH} color={colors.muted} size={18} strokeWidth={2} />
                    <TextInput
                        testID="main-currency-search"
                        accessibilityLabel={t("currency.searchAccessibility")}
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        placeholder={t("currency.searchPlaceholder")}
                        placeholderTextColor={colors.muted}
                        selectionColor={colors.accent}
                        className="h-full min-w-0 flex-1"
                        style={{ padding: 0, color: colors.ink, fontFamily: "Archivo", fontSize: 16 }}
                    />
                    {query ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("currency.clearSearch")}
                            onPress={() => setQuery("")}
                            hitSlop={4}
                            className="h-9 w-9 items-center justify-center rounded-full"
                        >
                            <LineIcon d={CLEAR_PATH} color={colors.muted} size={14} strokeWidth={2.6} />
                        </Pressable>
                    ) : null}
                </View>
            }
        >
            <ScrollView
                className="flex-1"
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: insets.bottom + 40 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
            >
                {errorHint ? (
                    <View className="mt-4 gap-3">
                        <Text accessibilityLiveRegion="polite" className="px-1 font-sans text-[13px] leading-5 text-muted">{errorHint}</Text>
                        {loadError ? (
                            <TryAgainButton onPress={() => void useCurrencyStore.getState().load()} />
                        ) : ratesFailed ? (
                            <TryAgainButton onPress={() => void useCurrencyStore.getState().refreshRates({ force: true })} />
                        ) : null}
                    </View>
                ) : null}
                {search ? (
                    results.length ? (
                        <>
                            <Heading first>{t("currency.results")}</Heading>
                            <CurrencyRows label={t("currency.resultsAccessibility")} rows={results} selected={main} onPick={pick} />
                        </>
                    ) : (
                        <Text accessibilityLiveRegion="polite" className="mx-3 mt-9 text-center font-sans text-[14px] leading-5 text-muted">
                            {t("currency.noResults", { query: query.trim() })}
                        </Text>
                    )
                ) : (
                    <>
                        <Heading first>{t("currency.suggested")}</Heading>
                        <CurrencyRows label={t("currency.suggested")} rows={suggested} selected={main} onPick={pick} />
                        <Heading>{t("currency.all")}</Heading>
                        <CurrencyRows label={t("currency.all")} rows={all} selected={main} onPick={pick} />
                    </>
                )}
            </ScrollView>
        </AppSheet>
    );
}
