import { Fragment, type ReactNode, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { CheckIcon } from "@/components/check-icon";
import { Raised, type RaisedTone } from "@/components/elevated/raised";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import {
    type Currency,
    type CurrencyCode,
    currencyName,
    currencySymbol,
    isCurrencyCode,
    POPULAR_CURRENCIES,
    resolveCurrency,
} from "./currencies";
import { withTallDollar } from "./currency-text";

function Card({ title, surface, children }: { title: string; surface: RaisedTone; children: ReactNode[] }) {
    return (
        <View>
            <Text className="mb-2.5 ml-1 font-sans text-[13px] font-semibold text-muted">{title}</Text>
            <Raised surface={surface} depth={3} radius={20} className="overflow-hidden">
                {children.map((row, index) => (
                    <Fragment key={index}>
                        {index > 0 ? <View className="mx-4 h-px bg-track opacity-40" /> : null}
                        {row}
                    </Fragment>
                ))}
            </Raised>
        </View>
    );
}

function SymbolBadge({ symbol }: { symbol: string }) {
    return (
        <View className="h-9 w-[54px] items-center justify-center rounded-[11px] bg-active px-1">
            <Text numberOfLines={1} className="font-sans text-[15px] font-semibold text-ink">{withTallDollar(symbol, 15)}</Text>
        </View>
    );
}

export function CurrencyList({
    value,
    surface = "row",
    live = false,
    onChange,
    onPick,
}: {
    value: Currency;
    surface?: RaisedTone;
    live?: boolean;
    onChange: (value: Currency) => void;
    onPick?: () => void;
}) {
    const { t, locale } = useI18n();
    const { colors } = useEarningsTheme();
    const [text, setText] = useState(isCurrencyCode(value) ? "" : value);
    const typed = resolveCurrency(text);
    const codes: readonly CurrencyCode[] = isCurrencyCode(value) && !POPULAR_CURRENCIES.includes(value)
        ? [...POPULAR_CURRENCIES, value]
        : POPULAR_CURRENCIES;

    const pick = (code: CurrencyCode) => {
        appHaptics.selection();
        setText("");
        if (code !== value) onChange(code);
        onPick?.();
    };
    const commit = () => {
        if (typed && typed !== value) onChange(typed);
        if (typed && isCurrencyCode(typed)) setText("");
        else if (!typed && !isCurrencyCode(value)) setText(value);
    };

    return (
        <View className="gap-7">
            <Card title={t("currency.popular")} surface={surface}>
                {codes.map((code) => {
                    const checked = code === value;
                    return (
                        <Pressable
                            key={code}
                            testID={`currency-${code}`}
                            accessibilityRole="radio"
                            accessibilityState={{ checked }}
                            accessibilityLabel={currencyName(code, locale)}
                            onPress={() => pick(code)}
                            className="min-h-[56px] flex-row items-center gap-3.5 px-4"
                        >
                            <SymbolBadge symbol={currencySymbol(code)} />
                            <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[16px] font-medium text-ink">
                                {currencyName(code, locale)}
                            </Text>
                            <Text className="font-sans text-[13px] text-muted">{code}</Text>
                            <View className="w-[18px] items-center">
                                {checked ? <CheckIcon size={18} color={colors.accentDeep} /> : null}
                            </View>
                        </Pressable>
                    );
                })}
            </Card>

            <View className="gap-2">
                <Card title={t("currency.customTitle")} surface={surface}>
                    {[
                        <View key="custom" className="min-h-[56px] flex-row items-center gap-3.5 pr-4 pl-1">
                            <TextInput
                                testID="currency-custom"
                                accessibilityLabel={t("currency.customAccessibility")}
                                value={text}
                                onChangeText={(next) => {
                                    setText(next);
                                    const resolved = resolveCurrency(next);
                                    if (live && resolved && resolved !== value) onChange(resolved);
                                }}
                                onEndEditing={commit}
                                onSubmitEditing={commit}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={12}
                                returnKeyType="done"
                                placeholder={t("currency.customPlaceholder")}
                                placeholderTextColor={colors.muted}
                                selectionColor={colors.accent}
                                className="min-w-0 flex-1"
                                style={{ height: 56, paddingHorizontal: 15, color: colors.ink, fontFamily: "Archivo-Medium", fontSize: 16 }}
                            />
                            <View className="w-[18px] items-center">
                                {!isCurrencyCode(value) ? <CheckIcon size={18} color={colors.accentDeep} /> : null}
                            </View>
                        </View>,
                    ]}
                </Card>
                <Text accessibilityLiveRegion="polite" className="px-1 font-sans text-[12.5px] leading-[18px] text-muted">
                    {typed && isCurrencyCode(typed)
                        ? t("currency.recognized", { name: currencyName(typed, locale) })
                        : t("currency.customHint")}
                </Text>
            </View>
        </View>
    );
}
