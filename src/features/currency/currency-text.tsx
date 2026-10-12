import type { ReactNode } from "react";
import { Text } from "react-native";

const DOLLAR_SCALE = 1.22;

export function withTallDollar(text: string, fontSize: number): ReactNode {
    if (!text.includes("$") || !/[A-Za-zÀ-ž]/.test(text)) return text;
    return text.split(/(\$)/).map((part, index) => part === "$"
        ? <Text key={index} style={{ fontSize: fontSize * DOLLAR_SCALE }}>$</Text>
        : part);
}
