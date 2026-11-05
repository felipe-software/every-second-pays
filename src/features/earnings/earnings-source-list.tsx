import { ScrollView, Text, type View } from "react-native";

import { HAS_TAB_DOCK } from "@/constants/tab-dock";
import type { Currency } from "@/features/currency/currencies";
import { useI18n } from "@/features/i18n/i18n";

import { EarningsListStatus } from "./earnings-list-status";
import type { MoneyTransfer } from "./money-counter-celebration";
import type { PaymentSource } from "./model";
import { SourceRow } from "./source-row";
import { sourceRowLabels } from "./source-row-labels";

export function EarningsSourceList({
    custom,
    earnedBySource,
    loadError,
    mainCurrency,
    moneyTransfer,
    now,
    onEditSource,
    onRetry,
    onValueNodeChange,
    ready,
    sources,
    unconvertedCount,
}: {
    custom: boolean;
    earnedBySource: ReadonlyMap<number, number>;
    loadError: boolean;
    mainCurrency: Currency;
    moneyTransfer: MoneyTransfer | null;
    now: Date;
    onEditSource: (sourceId: number) => void;
    onRetry: () => Promise<void>;
    onValueNodeChange: (sourceId: number, node: View | null) => void;
    ready: boolean;
    sources: readonly PaymentSource[];
    unconvertedCount: number;
}) {
    const i18n = useI18n();
    const { t } = i18n;

    return (
        <ScrollView
            // 38.6 keeps the list where it sat under the old rate line: 16 + 13.6 + 56 - 12 - 35.
            className="mt-[38.6px] flex-1 px-[22px]"
            contentContainerStyle={{ gap: 10, paddingBottom: HAS_TAB_DOCK ? 124 : 32 }}
            showsVerticalScrollIndicator={false}
        >
            <EarningsListStatus empty={ready && sources.length === 0} loadError={loadError} onRetry={onRetry} />
            {sources.map((source, index) => (
                <SourceRow
                    key={source.id}
                    {...sourceRowLabels(
                        {
                            source,
                            currency: source.currency ?? mainCurrency,
                            earned: earnedBySource.get(source.id) ?? 0,
                            now,
                        },
                        i18n,
                    )}
                    source={source}
                    index={index}
                    onPress={onEditSource}
                    onValueNodeChange={onValueNodeChange}
                    transferId={
                        moneyTransfer?.origins.some((origin) => origin.sourceId === source.id) ? moneyTransfer.id : null
                    }
                    transferDelay={moneyTransfer?.origins.find((origin) => origin.sourceId === source.id)?.delay ?? 0}
                />
            ))}
            {ready && unconvertedCount ? (
                <Text
                    accessibilityLiveRegion="polite"
                    className="px-2 pt-1 text-center font-sans text-[12.5px] leading-[17px] text-muted"
                >
                    {t(custom ? "home.notConvertible" : "home.ratesMissing")}
                </Text>
            ) : null}
        </ScrollView>
    );
}
