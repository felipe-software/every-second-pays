import { Fragment } from "react";
import { Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import type { Frequency, PaymentDraft } from "./model";
import type { PaymentToken } from "./payment-editor";
import { TokenButton } from "./payment-sheet-controls";

const FREQUENCY_KEYS: Record<Frequency, TranslationKey> = {
    hour: "payment.frequencySummary.hour",
    week: "payment.frequencySummary.week",
    month: "payment.frequencySummary.month",
    year: "payment.frequencySummary.year",
    second: "payment.frequencySummary.second",
    once: "payment.frequencySummary.once",
};

function Connector({ children }: { children: string }) {
    return <Text className="font-sans text-[24px] leading-8 font-medium text-muted">{children}</Text>;
}

export function PaymentSummary({
    draft,
    amount,
    token,
    onTokenChange,
}: {
    draft: PaymentDraft;
    amount: number;
    token: PaymentToken;
    onTokenChange: (token: PaymentToken) => void;
}) {
    const { t, locale, formatDays, formatMoney, formatTime } = useI18n();
    const recurring = draft.frequency !== "once";

    return (
        <View testID="payment-sheet" className="flex-row flex-wrap items-center px-6 pt-1 pb-5">
            <TokenButton active={token === "name"} onPress={() => onTokenChange("name")}>
                {draft.name.trim() || t("payment.someone")}
            </TokenButton>
            <Connector>{t(recurring ? "payment.summary.paysMe" : "payment.summary.paidMe")}</Connector>
            <TokenButton active={token === "amount"} onPress={() => onTokenChange("amount")}>
                {amount ? `$${formatMoney(amount, 0)}` : "$0"}
            </TokenButton>
            <Connector> </Connector>
            <TokenButton active={token === "frequency"} onPress={() => onTokenChange("frequency")}>
                {t(FREQUENCY_KEYS[draft.frequency])}
            </TokenButton>
            {recurring ? (
                <>
                    <Connector>{t("payment.summary.on")}</Connector>
                    <TokenButton active={token === "days"} onPress={() => onTokenChange("days")}>
                        {formatDays(draft.days)}
                    </TokenButton>
                    {draft.shifts.map((shift, index) => (
                        <Fragment key={`${shift.start}-${shift.end}-${index}`}>
                            <Connector>{t(index === 0 ? "payment.summary.from" : "payment.summary.andFrom")}</Connector>
                            <TokenButton active={token === "hours"} onPress={() => onTokenChange("hours")}>
                                {formatTime(shift.start)}
                            </TokenButton>
                            <Connector>{t("payment.summary.to")}</Connector>
                            <TokenButton active={token === "hours"} onPress={() => onTokenChange("hours")}>
                                {formatTime(shift.end)}
                            </TokenButton>
                        </Fragment>
                    ))}
                    <Connector>.</Connector>
                </>
            ) : (
                <>
                    <Connector>{t("payment.summary.landing")}</Connector>
                    <TokenButton active={token === "when"} onPress={() => onTokenChange("when")}>
                        {t(draft.when === "later" ? "payment.when.later" : "payment.when.today").toLocaleLowerCase(locale)}
                    </TokenButton>
                    <Connector>.</Connector>
                </>
            )}
        </View>
    );
}
