import { View } from "react-native";

import { withAlpha } from "@/features/appearance/color";
import { useEarningsTheme } from "@/features/earnings/theme";

import type { MoneyWidgetConfig } from "./widget-config";

export function BackgroundArt({ background }: { background: MoneyWidgetConfig["background"] }) {
    const { colors } = useEarningsTheme();
    if (background === "solid") return null;
    if (background === "glow") {
        const deepGlow = `radial-gradient(ellipse 35% 75% at 85% 105%, ${withAlpha(colors.accentDeep, 0.32)}, ${withAlpha(colors.accentDeep, 0)})`;
        const accentGlow = `radial-gradient(ellipse 40% 85% at 20% 25%, ${withAlpha(colors.accent, 0.5)}, ${withAlpha(colors.accent, 0)})`;
        return (
            <View className="absolute inset-0" style={{ experimental_backgroundImage: `${deepGlow}, ${accentGlow}` }} />
        );
    }
    return (
        <>
            <View
                className="absolute inset-0"
                style={{
                    experimental_backgroundImage: `linear-gradient(to bottom right, ${colors.accent}, ${colors.accentDeep})`,
                }}
            />
            <View
                className="absolute left-[10px] top-[9px] size-[22px] rounded-full"
                style={{ backgroundColor: withAlpha(colors.canvas, 0.55) }}
            />
            <View
                className="absolute inset-x-[9px] inset-y-[7px] rounded-[9px]"
                style={{ backgroundColor: `${colors.canvas}BD` }}
            />
        </>
    );
}
