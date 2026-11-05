import { memo } from "react";
import { View } from "react-native";

import { useLowEndDevice } from "@/features/device/low-end";

import { BlurredEarningsBackground } from "./blurred-earnings-background";
import type { MoneyTransfer } from "./money-counter-celebration";

export const EarningsBackground = memo(function EarningsBackground({
    celebrationId,
    celebrationTarget,
}: {
    celebrationId?: number;
    celebrationTarget?: MoneyTransfer["target"];
}) {
    const lowEnd = useLowEndDevice();
    if (lowEnd) {
        return (
            <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute inset-0 bg-canvas"
            />
        );
    }
    return <BlurredEarningsBackground celebrationId={celebrationId} celebrationTarget={celebrationTarget} />;
});
