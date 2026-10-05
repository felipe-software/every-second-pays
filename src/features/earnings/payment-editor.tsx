import { Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { DaysEditor } from "./days-editor";
import { HoursEditor } from "./hours/hours-editor";
import { FREQUENCIES, type Frequency, type PaymentDraft } from "./model";
import { ChoiceChip, NativeField } from "./payment-sheet-controls";

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
}: {
    draft: PaymentDraft;
    token: PaymentToken;
    onTokenChange: (token: PaymentToken) => void;
    onPatch: (patch: Partial<PaymentDraft>) => void;
}) {
    const { t } = useI18n();

    if (token === "name") {
        return <NativeField value={draft.name} onChangeText={(name) => onPatch({ name })} placeholder={t("payment.companyPlaceholder")} />;
    }

    if (token === "amount") {
        return (
            <View className="flex-row items-center gap-2">
                <Text className="font-sans text-[32px] font-bold text-muted">$</Text>
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
        );
    }

    if (token === "frequency") {
        return (
            <View className="gap-2.5">
                <Text className="font-sans text-[10.5px] font-semibold tracking-[1.25px] text-muted uppercase">{t("payment.paidPer")}</Text>
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
