import { useIsFocused } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMainCurrencySources } from "@/features/currency/use-main-currency-sources";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { EarningsHeader } from "@/features/earnings/earnings-header";
import { EarningsSourceList } from "@/features/earnings/earnings-source-list";
import { EmptySourcesCallout } from "@/features/earnings/empty-sources";
import { earnedInPeriod } from "@/features/earnings/model";
import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { PaymentSheet } from "@/features/earnings/payment-sheet";
import { paymentSourceActions } from "@/features/earnings/payment-source-actions";
import { usePeriodStore } from "@/features/earnings/period-store";
import { useEarningsStore } from "@/features/earnings/store";
import { useMoneyTransferDisplay } from "@/features/earnings/use-money-transfer-display";
import { useI18n } from "@/features/i18n/i18n";
import { useOnboardingStore } from "@/features/onboarding/store";

function useLiveClock(tickMs: number) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), tickMs);
        return () => clearInterval(timer);
    }, [tickMs]);

    return now;
}

const FOCUSED_TICK_MS = 200;
// Stays mounted behind Settings and can be swiped into view, so it slows down instead of stopping.
const HIDDEN_TICK_MS = 5000;

export default function EarningsScreen() {
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { t, firstDayOfWeek } = useI18n();
    const now = useLiveClock(isFocused ? FOCUSED_TICK_MS : HIDDEN_TICK_MS);
    const period = usePeriodStore((state) => state.period);
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const saving = useEarningsStore((state) => state.saving);
    const loadError = useEarningsStore((state) => state.loadError);
    const load = useEarningsStore((state) => state.load);
    const save = useEarningsStore((state) => state.save);
    const remove = useEarningsStore((state) => state.remove);
    const newSourceRequest = usePaymentComposerStore((state) => state.newSourceRequest);
    const onboarded = useOnboardingStore((state) => state.status === "done");
    const handledNewSourceRequest = useRef(0);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        void load();
    }, [load]);

    const editingSource = sources.find((source) => source.id === editingId);
    const { main: mainCurrency, converted, unconverted, custom } = useMainCurrencySources(sources);
    const earnedBySource = useMemo(
        () => new Map(sources.map((source) => [source.id, earnedInPeriod(source, period, now, firstDayOfWeek)])),
        [firstDayOfWeek, now, period, sources],
    );
    const calculatedTotal = useMemo(
        () => converted.reduce((sum, source) => sum + earnedInPeriod(source, period, now, firstDayOfWeek), 0),
        [converted, firstDayOfWeek, now, period],
    );
    const { celebrateSource, displayedTotal, moneyTransfer, registerSourceValueNode } = useMoneyTransferDisplay({
        calculatedTotal,
        converted,
        isFocused,
        now,
        period,
        ready,
        sheetOpen,
        sources,
    });

    const openNewSource = () => {
        setEditingId(null);
        setSheetOpen(true);
    };

    useEffect(() => {
        if (newSourceRequest <= handledNewSourceRequest.current) return;
        handledNewSourceRequest.current = newSourceRequest;
        openNewSource();
    }, [newSourceRequest]);

    const closeSheet = () => {
        if (useEarningsStore.getState().saving) return;
        setSheetOpen(false);
        setEditingId(null);
    };

    const { saveSource, removeSource } = paymentSourceActions({
        onCelebrate: celebrateSource,
        remove,
        save,
        t,
    });

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden">
                <EarningsBackground celebrationId={moneyTransfer?.id} celebrationTarget={moneyTransfer?.target} />

                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <EarningsHeader
                        total={displayedTotal}
                        currency={mainCurrency}
                        ready={ready}
                        loadError={loadError}
                        moneyTransfer={moneyTransfer}
                    />

                    <EarningsSourceList
                        custom={custom}
                        earnedBySource={earnedBySource}
                        loadError={loadError}
                        mainCurrency={mainCurrency}
                        moneyTransfer={moneyTransfer}
                        now={now}
                        onEditSource={(sourceId) => {
                            setEditingId(sourceId);
                            setSheetOpen(true);
                        }}
                        onRetry={load}
                        onValueNodeChange={registerSourceValueNode}
                        ready={ready}
                        sources={sources}
                        unconvertedCount={unconverted.length}
                    />

                    {ready && onboarded && sources.length === 0 && !loadError && !sheetOpen ? (
                        <EmptySourcesCallout bottomInset={insets.bottom} />
                    ) : null}
                </View>

                {sheetOpen ? (
                    <PaymentSheet
                        source={editingSource}
                        saving={saving}
                        onDismiss={closeSheet}
                        onDelete={removeSource}
                        onSave={saveSource}
                    />
                ) : null}
            </View>
        </View>
    );
}
