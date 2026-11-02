import type { View } from "react-native";

import type { MoneyTransfer } from "./money-counter-celebration";

export type MeasuredRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type FlyingNote = {
    id: number;
    delay: number;
    size: number;
    targetX: number;
    targetY: number;
    startX: number;
    startY: number;
    curveX: number;
    startRotation: number;
    middleRotation: number;
    endRotation: number;
    mirrorX: 1 | -1;
};

export type MoneyBurst = {
    id: number;
    sourceId: number;
    notes: FlyingNote[];
};

type BurstSource = Pick<MoneyTransfer["origins"][number], "delay" | "sourceId">;
type BurstFrame = { target: MeasuredRect; stage: MeasuredRect };

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function measureInWindow(node: View) {
    return new Promise<MeasuredRect>((resolve) => {
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
    });
}

function noteCountFor(target: MoneyTransfer["target"]) {
    const variation = Math.random() < 0.5 ? 0 : 1;
    return target === "whole" ? 4 + variation : 1 + variation;
}

export function createMoneyBurst(
    transfer: MoneyTransfer,
    source: BurstSource,
    origin: MeasuredRect,
    { target, stage }: BurstFrame,
): MoneyBurst {
    const count = noteCountFor(transfer.target);
    const notes = Array.from({ length: count }, (_, index) => {
        const originX = origin.x + origin.width / 2 + randomBetween(-origin.width * 0.32, origin.width * 0.32);
        const originY = origin.y + origin.height / 2 + randomBetween(-origin.height * 0.3, origin.height * 0.3);
        const targetSpreadX = Math.min(10, target.width * 0.16);
        const targetSpreadY = Math.min(5, target.height * 0.12);
        const targetX = target.x + target.width / 2 + randomBetween(-targetSpreadX, targetSpreadX);
        const targetY = target.y + target.height / 2 + randomBetween(-targetSpreadY, targetSpreadY);
        const startRotation = randomBetween(-42, 42);
        const mirrorX: 1 | -1 = Math.random() < 0.5 ? -1 : 1;

        return {
            id: index,
            delay: source.delay + index * randomBetween(32, 52),
            size: randomBetween(72, 96),
            targetX: targetX - stage.x,
            targetY: targetY - stage.y,
            startX: originX - targetX,
            startY: originY - targetY,
            curveX: randomBetween(-46, 46),
            startRotation,
            middleRotation: startRotation + randomBetween(-58, 58),
            endRotation: randomBetween(-18, 18),
            mirrorX,
        };
    });

    return { id: transfer.id, sourceId: source.sourceId, notes };
}
