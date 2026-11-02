import type { RefObject } from "react";
import type { View } from "react-native";

import type { MoneyTransfer } from "./money-counter-celebration";
import {
    launchingSources,
    pendingTargetDropped,
    plannedTotalUpdates,
    transferOrigins,
    transferTarget,
} from "./money-transfer-plan";
import type { EarningsPeriod, PaymentSource } from "./model";

const MIN_TRANSFER_INTERVAL = 950;

export type Timer = ReturnType<typeof setTimeout>;

type MoneyTransferStep = {
    calculatedCents: number;
    clearUpdateTimers: () => void;
    converted: readonly PaymentSource[];
    displayedCentsRef: RefObject<number>;
    displayedPeriod: RefObject<EarningsPeriod>;
    initializedDisplay: RefObject<boolean>;
    isFocused: boolean;
    lastTransferAt: RefObject<number>;
    nextTransferId: RefObject<number>;
    now: Date;
    pendingCelebrationSourceId: RefObject<number | null>;
    pendingTargetCents: RefObject<number | null>;
    period: EarningsPeriod;
    setMoneyTransfer: (transfer: MoneyTransfer) => void;
    sheetOpen: boolean;
    sourceValueNodes: RefObject<Map<number, View>>;
    sources: readonly PaymentSource[];
    syncDisplayedTotal: (cents: number) => void;
    updateDisplayedTotal: (cents: number) => void;
    updateTimers: RefObject<Timer[]>;
};

function withoutTimer(timers: readonly Timer[], timer: Timer) {
    return timers.filter((item) => item !== timer);
}

function settledByPeriodOrFocus(step: MoneyTransferStep) {
    if (step.displayedPeriod.current !== step.period) {
        step.displayedPeriod.current = step.period;
        step.clearUpdateTimers();
        step.syncDisplayedTotal(step.calculatedCents);
        return true;
    }

    if (!step.isFocused) {
        step.clearUpdateTimers();
        step.initializedDisplay.current = true;
        step.syncDisplayedTotal(step.calculatedCents);
        return true;
    }

    return false;
}

function settledBySheetOrFirstRun(step: MoneyTransferStep) {
    // Wait for the sheet to close: new rows need window coordinates, and the flight would be hidden.
    if (step.sheetOpen) return true;

    if (!step.initializedDisplay.current) {
        step.initializedDisplay.current = true;
        step.syncDisplayedTotal(step.calculatedCents);
        return true;
    }

    return false;
}

function settledWithoutTransfer(step: MoneyTransferStep) {
    return settledByPeriodOrFocus(step) || settledBySheetOrFirstRun(step);
}

function takeCelebrationSourceId(step: MoneyTransferStep) {
    if (pendingTargetDropped(step.updateTimers.current.length, step.pendingTargetCents.current, step.calculatedCents)) {
        step.clearUpdateTimers();
    }

    const celebrationSourceId = step.pendingCelebrationSourceId.current;
    step.pendingCelebrationSourceId.current = null;
    if (celebrationSourceId != null) step.clearUpdateTimers();
    return celebrationSourceId;
}

function transferThrottled(step: MoneyTransferStep) {
    return step.updateTimers.current.length > 0 || Date.now() - step.lastTransferAt.current < MIN_TRANSFER_INTERVAL;
}

function transferHeld(step: MoneyTransferStep, celebrating: boolean, displayedCents: number) {
    if (celebrating) return false;
    if (step.calculatedCents < displayedCents) step.syncDisplayedTotal(step.calculatedCents);
    return step.calculatedCents <= displayedCents || transferThrottled(step);
}

function scheduleTotalUpdates(step: MoneyTransferStep, updates: readonly { cents: number; delay: number }[]) {
    return updates.map(({ cents, delay }) => {
        const timer = setTimeout(() => {
            step.updateTimers.current = withoutTimer(step.updateTimers.current, timer);
            if (!step.updateTimers.current.length) step.pendingTargetCents.current = null;
            step.updateDisplayedTotal(cents);
        }, delay);
        return timer;
    });
}

function launchTransfer(
    step: MoneyTransferStep,
    origins: ReturnType<typeof transferOrigins>,
    celebrating: boolean,
    displayedCents: number,
) {
    step.nextTransferId.current += 1;
    step.lastTransferAt.current = Date.now();

    step.setMoneyTransfer({
        id: step.nextTransferId.current,
        origins: origins.map(({ delay, node, sourceId }) => ({ delay, node, sourceId })),
        ...transferTarget(celebrating, displayedCents, step.calculatedCents),
    });

    step.pendingTargetCents.current = step.calculatedCents;
    step.updateTimers.current = scheduleTotalUpdates(
        step,
        plannedTotalUpdates(origins, displayedCents, step.calculatedCents),
    );
}

export function advanceMoneyTransfer(step: MoneyTransferStep) {
    if (settledWithoutTransfer(step)) return;

    const celebrationSourceId = takeCelebrationSourceId(step);
    const celebrating = celebrationSourceId != null;
    const displayedCents = step.displayedCentsRef.current;
    if (transferHeld(step, celebrating, displayedCents)) return;

    const launching = launchingSources(celebrationSourceId, step.sources, step.converted, step.now);
    const origins = transferOrigins(launching, step.sourceValueNodes.current, step.now);
    if (!origins.length) {
        step.syncDisplayedTotal(step.calculatedCents);
        return;
    }

    launchTransfer(step, origins, celebrating, displayedCents);
}
