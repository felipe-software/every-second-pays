import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EarningsBackground } from "@/features/earnings/earnings-background";
import { EarningsHeader } from "@/features/earnings/earnings-header";
import { MONEY_IMPACT_DELAY, type MoneyTransfer } from "@/features/earnings/money-counter-celebration";
import { EmptySourcesCallout, EmptySourcesMessage } from "@/features/earnings/empty-sources";
import { type PaymentDraft, type PaymentSource, currentShift, earnedToday, ratePerSecond } from "@/features/earnings/model";
import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { PaymentSheet, PrimaryButton } from "@/features/earnings/payment-sheet";
import { SourceRow } from "@/features/earnings/source-row";
import { useEarningsStore } from "@/features/earnings/store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";

function useLiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 200);
        return () => clearInterval(timer);
    }, []);

    return now;
}

const MIN_TRANSFER_INTERVAL = 950;

function pickSourceByRate(sources: PaymentSource[]) {
    const rates = sources.map((source) => ratePerSecond(source));
    const totalRate = rates.reduce((sum, rate) => sum + rate, 0);
    let cursor = Math.random() * totalRate;

    for (let index = 0; index < sources.length; index += 1) {
        cursor -= rates[index];
        if (cursor <= 0) return sources[index];
    }

    return sources[sources.length - 1];
}

function firstChangedDigitIndex(previousValue: number, nextValue: number) {
    const previous = String(previousValue);
    const next = String(nextValue);

    if (previous.length !== next.length) return 0;

    let index = 0;
    while (index < next.length && previous[index] === next[index]) index += 1;
    return index;
}

export default function EarningsScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useEarningsTheme();
    const { t } = useI18n();
    const now = useLiveClock();
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const saving = useEarningsStore((state) => state.saving);
    const loadError = useEarningsStore((state) => state.loadError);
    const load = useEarningsStore((state) => state.load);
    const save = useEarningsStore((state) => state.save);
    const remove = useEarningsStore((state) => state.remove);
    const newSourceRequest = usePaymentComposerStore((state) => state.newSourceRequest);
    const handledNewSourceRequest = useRef(0);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        void load();
    }, [load]);

    const editingSource = sources.find((source) => source.id === editingId);
    const calculatedTotal = useMemo(
        () => sources.reduce((sum, source) => sum + earnedToday(source, now), 0),
        [now, sources],
    );
    const liveRate = useMemo(
        () => sources.reduce((sum, source) => sum + (currentShift(source, now) ? ratePerSecond(source) : 0), 0),
        [now, sources],
    );
    const [displayedTotal, setDisplayedTotal] = useState(0);
    const [moneyTransfer, setMoneyTransfer] = useState<MoneyTransfer | null>(null);
    const displayedCentsRef = useRef(0);
    const lastTransferAt = useRef(0);
    const nextTransferId = useRef(0);
    const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initializedDisplay = useRef(false);
    const sourceValueNodes = useRef(new Map<number, View>());

    const registerSourceValueNode = useCallback((sourceId: number, node: View | null) => {
        if (node) sourceValueNodes.current.set(sourceId, node);
        else sourceValueNodes.current.delete(sourceId);
    }, []);

    const updateDisplayedTotal = useCallback((cents: number) => {
        displayedCentsRef.current = cents;
        setDisplayedTotal(cents / 100);
    }, []);

    const syncDisplayedTotal = useCallback((cents: number) => {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
            syncTimer.current = null;
            updateDisplayedTotal(cents);
        }, 0);
    }, [updateDisplayedTotal]);

    useEffect(() => {
        if (!ready) return;

        const calculatedCents = Math.round(calculatedTotal * 100);
        if (!initializedDisplay.current) {
            initializedDisplay.current = true;
            syncDisplayedTotal(calculatedCents);
            return;
        }

        const displayedCents = displayedCentsRef.current;
        if (calculatedCents <= displayedCents) {
            if (calculatedCents < displayedCents && !updateTimer.current) {
                syncDisplayedTotal(calculatedCents);
            }
            return;
        }

        if (updateTimer.current || Date.now() - lastTransferAt.current < MIN_TRANSFER_INTERVAL) return;

        const activeSources = sources.filter((source) => currentShift(source, now));
        if (!activeSources.length) {
            syncDisplayedTotal(calculatedCents);
            return;
        }

        const source = pickSourceByRate(activeSources);
        const origin = sourceValueNodes.current.get(source.id);
        if (!origin) {
            syncDisplayedTotal(calculatedCents);
            return;
        }

        nextTransferId.current += 1;
        lastTransferAt.current = Date.now();
        const displayedWhole = Math.floor(displayedCents / 100);
        const calculatedWhole = Math.floor(calculatedCents / 100);
        const transferTarget = displayedWhole === calculatedWhole
            ? { target: "cents" as const }
            : {
                target: "whole" as const,
                nextWhole: calculatedWhole,
                changedDigitIndex: firstChangedDigitIndex(displayedWhole, calculatedWhole),
            };

        setMoneyTransfer({
            id: nextTransferId.current,
            origin,
            sourceId: source.id,
            ...transferTarget,
        });

        updateTimer.current = setTimeout(() => {
            updateTimer.current = null;
            updateDisplayedTotal(calculatedCents);
        }, MONEY_IMPACT_DELAY);
    }, [calculatedTotal, now, ready, sources, syncDisplayedTotal, updateDisplayedTotal]);

    useEffect(() => () => {
        if (updateTimer.current) clearTimeout(updateTimer.current);
        if (syncTimer.current) clearTimeout(syncTimer.current);
    }, []);

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

    const saveSource = async (draft: PaymentDraft, id?: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await save(draft, id);
        } catch {
            Alert.alert(t("home.saveErrorTitle"), t("home.saveErrorBody"));
            throw new Error("Could not save payment source");
        }
    };

    const removeSource = async (id: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await remove(id);
        } catch {
            Alert.alert(t("home.deleteErrorTitle"), t("home.deleteErrorBody"));
            throw new Error("Could not delete payment source");
        }
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground
                    celebrationId={moneyTransfer?.id}
                    celebrationTarget={moneyTransfer?.target}
                />

                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <EarningsHeader
                        total={displayedTotal}
                        liveRate={liveRate}
                        ready={ready}
                        loadError={loadError}
                        moneyTransfer={moneyTransfer}
                    />

                    <ScrollView
                        className="mt-14 flex-1 px-[22px]"
                        contentContainerStyle={{ gap: 10, paddingBottom: Platform.OS === "android" ? 124 : 32 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {loadError ? (
                            <View className="gap-3 py-4">
                                <Text className="text-center font-sans text-[14px] text-muted">{t("home.loadError")}</Text>
                                <PrimaryButton label={t("common.tryAgain")} onPress={() => void load()} />
                            </View>
                        ) : ready && sources.length === 0 ? (
                            <EmptySourcesMessage />
                        ) : null}
                        {sources.map((source) => (
                            <SourceRow
                                key={source.id}
                                source={source}
                                now={now}
                                onPress={() => {
                                    setEditingId(source.id);
                                    setSheetOpen(true);
                                }}
                                onValueNodeChange={registerSourceValueNode}
                                transferId={moneyTransfer?.sourceId === source.id ? moneyTransfer.id : null}
                            />
                        ))}
                    </ScrollView>

                    {ready && sources.length === 0 && !loadError && !sheetOpen ? (
                        <EmptySourcesCallout bottomInset={insets.bottom} />
                    ) : null}
                </View>

                {sheetOpen ? (
                    <PaymentSheet
                        source={editingSource}
                        now={now}
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
