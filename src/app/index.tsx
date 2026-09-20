import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EarningsBackground } from "@/features/earnings/earnings-background";
import { EarningsHeader } from "@/features/earnings/earnings-header";
import { MONEY_IMPACT_DELAY, type MoneyTransfer } from "@/features/earnings/money-counter-celebration";
import { EmptySourcesCallout, EmptySourcesMessage } from "@/features/earnings/empty-sources";
import { type PaymentDraft, currentShift, earnedToday, ratePerSecond } from "@/features/earnings/model";
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
const SOURCE_TRANSFER_STAGGER = 90;
const MAX_SOURCE_TRANSFER_STAGGER = 450;

function firstChangedDigitIndex(previousValue: number, nextValue: number) {
    const previous = String(previousValue);
    const next = String(nextValue);

    if (previous.length !== next.length) return 0;

    let index = 0;
    while (index < next.length && previous[index] === next[index]) index += 1;
    return index;
}

export default function EarningsScreen() {
    const isFocused = useIsFocused();
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
    const updateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const pendingTargetCents = useRef<number | null>(null);
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

    const clearUpdateTimers = useCallback(() => {
        updateTimers.current.forEach(clearTimeout);
        updateTimers.current = [];
        pendingTargetCents.current = null;
    }, []);

    useEffect(() => {
        if (!ready) return;

        const calculatedCents = Math.round(calculatedTotal * 100);
        if (!isFocused) {
            clearUpdateTimers();
            initializedDisplay.current = true;
            syncDisplayedTotal(calculatedCents);
            return;
        }

        // Saving updates the source list before the native sheet finishes dismissing.
        // Wait until the sheet is gone so newly mounted source values have valid window
        // coordinates and the money flight is visible instead of playing behind it.
        if (sheetOpen) return;

        if (!initializedDisplay.current) {
            initializedDisplay.current = true;
            syncDisplayedTotal(calculatedCents);
            return;
        }

        if (updateTimers.current.length
            && pendingTargetCents.current != null
            && calculatedCents < pendingTargetCents.current) {
            clearUpdateTimers();
        }

        const displayedCents = displayedCentsRef.current;
        if (calculatedCents <= displayedCents) {
            if (calculatedCents < displayedCents) {
                syncDisplayedTotal(calculatedCents);
            }
            return;
        }

        if (updateTimers.current.length || Date.now() - lastTransferAt.current < MIN_TRANSFER_INTERVAL) return;

        const activeSources = sources.filter((source) => currentShift(source, now));
        if (!activeSources.length) {
            syncDisplayedTotal(calculatedCents);
            return;
        }

        const origins = activeSources.flatMap((source, index) => {
            const node = sourceValueNodes.current.get(source.id);
            return node ? [{
                delay: Math.min(index * SOURCE_TRANSFER_STAGGER, MAX_SOURCE_TRANSFER_STAGGER),
                node,
                rate: ratePerSecond(source),
                sourceId: source.id,
            }] : [];
        });
        if (!origins.length) {
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
            origins: origins.map(({ delay, node, sourceId }) => ({ delay, node, sourceId })),
            ...transferTarget,
        });

        const totalRate = origins.reduce((sum, origin) => sum + origin.rate, 0);
        const centsToAdd = calculatedCents - displayedCents;
        let cumulativeRate = 0;
        pendingTargetCents.current = calculatedCents;
        updateTimers.current = origins.map((origin, index) => {
            cumulativeRate += origin.rate;
            const nextCents = index === origins.length - 1
                ? calculatedCents
                : displayedCents + Math.round(centsToAdd * cumulativeRate / totalRate);
            const timer = setTimeout(() => {
                updateTimers.current = updateTimers.current.filter((item) => item !== timer);
                if (!updateTimers.current.length) pendingTargetCents.current = null;
                updateDisplayedTotal(nextCents);
            }, MONEY_IMPACT_DELAY + origin.delay);
            return timer;
        });
    }, [calculatedTotal, clearUpdateTimers, isFocused, now, ready, sheetOpen, sources, syncDisplayedTotal, updateDisplayedTotal]);

    useEffect(() => () => {
        clearUpdateTimers();
        if (syncTimer.current) clearTimeout(syncTimer.current);
    }, [clearUpdateTimers]);

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
                                transferId={moneyTransfer?.origins.some((origin) => origin.sourceId === source.id)
                                    ? moneyTransfer.id
                                    : null}
                                transferDelay={moneyTransfer?.origins.find((origin) => origin.sourceId === source.id)?.delay ?? 0}
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
