import { useColorScheme } from "react-native";

const LIGHT_COLORS = {
    canvas: "#FCF4EC",
    sheet: "#FFFAF6",
    raised: "#FAEEE5",
    field: "#F3E5DB",
    ink: "#231914",
    muted: "#846F63",
    accent: "#E8763A",
    accentDeep: "#9C421A",
    danger: "#B4402C",
} as const;

const DARK_COLORS = {
    canvas: "#1D1513",
    sheet: "#2F2321",
    raised: "#3A2D2B",
    field: "#382C2B",
    ink: "#F4EDE8",
    muted: "#B0A093",
    accent: "#E8763A",
    accentDeep: "#EF9F75",
    danger: "#F08A7A",
} as const;

export function useEarningsTheme() {
    const isDark = useColorScheme() === "dark";

    return {
        isDark,
        colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    };
}
