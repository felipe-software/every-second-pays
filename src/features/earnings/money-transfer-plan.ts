import type { View } from "react-native";

import { MONEY_IMPACT_DELAY } from "./money-counter-celebration";
import { currentShift, type PaymentSource, ratePerSecond } from "./model";

const SOURCE_TRANSFER_STAGGER = 90;
const MAX_SOURCE_TRANSFER_STAGGER = 450;

type TransferTarget = { target: "cents" } | { target: "whole"; nextWhole: number; changedDigitIndex: number };

function firstChangedDigitIndex(previousValue: number, nextValue: number) {
    const previous = String(previousValue);
    const next = String(nextValue);

    if (previous.length !== next.length) return 0;

    let index = 0;
    while (index < next.length && previous[index] === next[index]) index += 1;
    return index;
}

export function pendingTargetDropped(pendingTimers: number, pendingTarget: number | null, calculatedCents: number) {
    return pendingTimers > 0 && pendingTarget != null && calculatedCents < pendingTarget;
}

export function launchingSources(
    celebrationSourceId: number | null,
    sources: readonly PaymentSource[],
    converted: readonly PaymentSource[],
    now: Date,
) {
    if (celebrationSourceId != null) return sources.filter((source) => source.id === celebrationSourceId);
    return converted.filter((source) => currentShift(source, now));
}

export function transferOrigins(sources: readonly PaymentSource[], valueNodes: ReadonlyMap<number, View>, now: Date) {
    return sources.flatMap((source, index) => {
        const node = valueNodes.get(source.id);
        return node
            ? [
                  {
                      delay: Math.min(index * SOURCE_TRANSFER_STAGGER, MAX_SOURCE_TRANSFER_STAGGER),
                      node,
                      rate: ratePerSecond(source, now),
                      sourceId: source.id,
                  },
              ]
            : [];
    });
}

export function transferTarget(celebrating: boolean, displayedCents: number, calculatedCents: number): TransferTarget {
    const displayedWhole = Math.floor(displayedCents / 100);
    const calculatedWhole = Math.floor(calculatedCents / 100);

    if (celebrating) return { target: "whole", nextWhole: calculatedWhole, changedDigitIndex: 0 };
    if (displayedWhole === calculatedWhole) return { target: "cents" };
    return {
        target: "whole",
        nextWhole: calculatedWhole,
        changedDigitIndex: firstChangedDigitIndex(displayedWhole, calculatedWhole),
    };
}

export function plannedTotalUpdates(
    origins: readonly { delay: number; rate: number }[],
    displayedCents: number,
    calculatedCents: number,
) {
    const totalRate = origins.reduce((sum, origin) => sum + origin.rate, 0);
    const centsToAdd = calculatedCents - displayedCents;
    let cumulativeRate = 0;
    return origins.map((origin, index) => {
        cumulativeRate += origin.rate;
        const cents =
            index === origins.length - 1
                ? calculatedCents
                : displayedCents + Math.round((centsToAdd * cumulativeRate) / totalRate);
        return { cents, delay: MONEY_IMPACT_DELAY + origin.delay };
    });
}
