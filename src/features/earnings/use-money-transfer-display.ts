import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "react-native";

import type { MoneyTransfer } from "./money-counter-celebration";
import { advanceMoneyTransfer, type Timer } from "./money-transfer-step";
import type { EarningsPeriod, PaymentSource } from "./model";

type MoneyTransferDisplayOptions = {
    calculatedTotal: number;
    converted: readonly PaymentSource[];
    isFocused: boolean;
    now: Date;
    period: EarningsPeriod;
    ready: boolean;
    sheetOpen: boolean;
    sources: readonly PaymentSource[];
};

function useDisplayedCents() {
    const [displayedTotal, setDisplayedTotal] = useState(0);
    const displayedCentsRef = useRef(0);
    const syncTimerRef = useRef<Timer | null>(null);

    const updateDisplayedTotal = useCallback((cents: number) => {
        displayedCentsRef.current = cents;
        setDisplayedTotal(cents / 100);
    }, []);

    const syncDisplayedTotal = useCallback(
        (cents: number) => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            syncTimerRef.current = setTimeout(() => {
                syncTimerRef.current = null;
                updateDisplayedTotal(cents);
            }, 0);
        },
        [updateDisplayedTotal],
    );

    return { displayedCentsRef, displayedTotal, syncDisplayedTotal, syncTimerRef, updateDisplayedTotal };
}

function useUpdateTimers() {
    const updateTimers = useRef<Timer[]>([]);
    const pendingTargetCents = useRef<number | null>(null);

    const clearUpdateTimers = useCallback(() => {
        updateTimers.current.forEach(clearTimeout);
        updateTimers.current = [];
        pendingTargetCents.current = null;
    }, []);

    return { clearUpdateTimers, pendingTargetCents, updateTimers };
}

export function useMoneyTransferDisplay({
    calculatedTotal,
    converted,
    isFocused,
    now,
    period,
    ready,
    sheetOpen,
    sources,
}: MoneyTransferDisplayOptions) {
    const pendingCelebrationSourceId = useRef<number | null>(null);
    const { displayedCentsRef, displayedTotal, syncDisplayedTotal, syncTimerRef, updateDisplayedTotal } =
        useDisplayedCents();
    const { clearUpdateTimers, pendingTargetCents, updateTimers } = useUpdateTimers();
    const [moneyTransfer, setMoneyTransfer] = useState<MoneyTransfer | null>(null);
    const lastTransferAt = useRef(0);
    const nextTransferId = useRef(0);
    const initializedDisplay = useRef(false);
    const displayedPeriod = useRef(period);
    const sourceValueNodes = useRef(new Map<number, View>());

    const celebrateSource = useCallback((sourceId: number) => {
        pendingCelebrationSourceId.current = sourceId;
    }, []);

    const registerSourceValueNode = useCallback((sourceId: number, node: View | null) => {
        if (node) sourceValueNodes.current.set(sourceId, node);
        else sourceValueNodes.current.delete(sourceId);
    }, []);

    useEffect(() => {
        if (!ready) return;

        advanceMoneyTransfer({
            calculatedCents: Math.round(calculatedTotal * 100),
            clearUpdateTimers,
            converted,
            displayedCentsRef,
            displayedPeriod,
            initializedDisplay,
            isFocused,
            lastTransferAt,
            nextTransferId,
            now,
            pendingCelebrationSourceId,
            pendingTargetCents,
            period,
            setMoneyTransfer,
            sheetOpen,
            sourceValueNodes,
            sources,
            syncDisplayedTotal,
            updateDisplayedTotal,
            updateTimers,
        });
    }, [
        calculatedTotal,
        clearUpdateTimers,
        converted,
        displayedCentsRef,
        isFocused,
        now,
        pendingTargetCents,
        period,
        ready,
        sheetOpen,
        sources,
        syncDisplayedTotal,
        updateDisplayedTotal,
        updateTimers,
    ]);

    useEffect(
        () => () => {
            clearUpdateTimers();
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        },
        [clearUpdateTimers, syncTimerRef],
    );

    return { celebrateSource, displayedTotal, moneyTransfer, registerSourceValueNode };
}
