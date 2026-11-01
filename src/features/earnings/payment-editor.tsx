import { Text, View } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { currencyName, currencySymbol, DEFAULT_CURRENCY, isCurrencyCode } from "@/features/currency/currencies";
import { withTallDollar } from "@/features/currency/currency-text";
import { appHaptics } from "@/features/haptics/haptics";
import { ForwardChevron } from "@/features/widgets/widget-glyphs";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { DaysEditor } from "./days-editor";
import { HoursEditor } from "./hours/hours-editor";
import { FREQUENCIES, type Frequency, type PaymentDraft } from "./model";
import { ChoiceChip, FieldLabel, NativeField } from "./payment-sheet-controls";
import { useEarningsTheme } from "./theme";

export type PaymentToken = "name" | "amount" | "frequency" | "days" | "hours" | "when";

const FREQUENCY_KEYS: Record<Frequency, TranslationKey> = {
    hour: "payment.frequency.hour",
    week: "payment.frequency.week",
    month: "payment.frequency.month",
    year: "payment.frequency.year",
    second: "payment.frequency.second",
    once: "payment.frequency.once",
};

export function PaymentEditor({
    draft,
    token,
    onTokenChange,
    onPatch,
    onOpenCurrency,
}: {
    draft: PaymentDraft;
    token: PaymentToken;
    onTokenChange: (token: PaymentToken) => void;
    onPatch: (patch: Partial<PaymentDraft>) => void;
    onOpenCurrency: () => void;
}) {
    const { t, locale } = useI18n();
    const { colors } = useEarningsTheme();

    if (token === "name") {
        return (
            <View className="gap-2.5">
                <FieldLabel label={t("payment.companyLabel")} required />
                <NativeField value={draft.name} onChangeText={(name) => onPatch({ name })} placeholder={t("payment.companyPlaceholder")} />
            </View>
        );
    }

    if (token === "amount") {
        const currency = draft.currency ?? DEFAULT_CURRENCY;
        return (
            <View className="gap-2.5">
                <FieldLabel label={t("payment.amountLabel")} required />
                <View className="flex-row items-center gap-2">
                    <Text className="font-sans text-[32px] font-bold text-muted">{withTallDollar(currencySymbol(currency), 32)}</Text>
                    <View className="flex-1">
                        <NativeField
                            value={draft.amount}
                            onChangeText={(amount) => onPatch({ amount: amount.replace(/[^0-9.,]/g, "") })}
                            placeholder="0"
                            numeric
                            large
                        />
                    </View>
                </View>
                <RaisedPressable
                    testID="source-currency"
                    accessibilityRole="button"
                    accessibilityLabel={`${t("payment.currency")}, ${currencyName(currency, locale)}`}
                    onPress={() => {
                        appHaptics.secondaryAction();
                        onOpenCurrency();
                    }}
                    surface="card"
                    depth={3}
                    radius={16}
                    className="min-h-[58px] flex-row items-center gap-2.5 px-4"
                >
                    <Text className="flex-1 font-sans text-[16px] font-medium text-ink">{t("payment.currency")}</Text>
                    <Text numberOfLines={1} className="max-w-[60%] font-sans text-[14px] text-muted">
                        {isCurrencyCode(currency) ? currencyName(currency, locale) : currency}
                    </Text>
                    <ForwardChevron color={colors.ink} />
                </RaisedPressable>
            </View>
        );
    }

    if (token === "frequency") {
        return (
            <View className="gap-2.5">
                <FieldLabel label={t("payment.paidPer")} />
                <View className="flex-row flex-wrap gap-2">
                    {FREQUENCIES.map((frequency) => (
                        <ChoiceChip
                            key={frequency}
                            label={t(FREQUENCY_KEYS[frequency])}
                            wide
                            selected={draft.frequency === frequency}
                            onPress={() => {
                                onPatch({ frequency });
                                if (frequency === "once") onTokenChange("when");
                            }}
                        />
                    ))}
                </View>
            </View>
        );
    }

    if (token === "when") {
        return (
            <View className="flex-row flex-wrap gap-2">
                {(["today", "later"] as const).map((when) => (
                    <ChoiceChip
                        key={when}
                        label={t(when === "today" ? "payment.when.today" : "payment.when.later")}
                        selected={draft.when === when}
                        onPress={() => onPatch({ when })}
                    />
                ))}
            </View>
        );
    }

    if (token === "days") {
        return <DaysEditor days={draft.days} onChange={(days) => onPatch({ days })} />;
    }

    return <HoursEditor shifts={draft.shifts} onChange={(shifts) => onPatch({ shifts })} />;
}
