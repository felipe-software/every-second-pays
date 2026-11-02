import { Text, View } from "react-native";

import { useEarningsTheme } from "@/features/earnings/theme";

import type { MoneyWidgetConfig } from "./widget-config";

const AMOUNT_SIZES: Readonly<Record<MoneyWidgetConfig["template"], number>> = { minimal: 17, ledger: 13, hero: 15 };

export function TemplateArt({
    template,
    symbol,
    amount,
    caption,
    period,
}: {
    template: MoneyWidgetConfig["template"];
    symbol: string;
    amount: string;
    caption: string;
    period: string;
}) {
    const { colors } = useEarningsTheme();
    const minimal = template === "minimal";
    const ledger = template === "ledger";
    const size = AMOUNT_SIZES[template];

    return (
        <View
            className={`flex-1 ${minimal ? "items-center justify-center" : `${ledger ? "items-start px-2" : "items-center px-1.5"} justify-between pt-[5px] pb-1`}`}
        >
            {minimal ? null : (
                <View className="flex-row items-center gap-[3px]">
                    <View className="h-1 w-1 rounded-full bg-accent" />
                    <Text
                        className="font-sans text-[6.5px] font-bold tracking-[0.4px]"
                        style={{ color: colors.accentDeep }}
                    >
                        {period}
                    </Text>
                </View>
            )}
            <Text
                numberOfLines={1}
                className="font-sans font-bold text-ink"
                style={{ fontSize: size, letterSpacing: minimal ? -0.6 : -0.5 }}
            >
                <Text className="font-sans font-medium text-muted" style={{ fontSize: Math.round(size * 0.47) }}>
                    {symbol}
                </Text>
                {amount}
            </Text>
            {minimal ? null : (
                <Text numberOfLines={1} className="font-sans text-[6.5px] font-medium text-muted">
                    {caption}
                </Text>
            )}
        </View>
    );
}
