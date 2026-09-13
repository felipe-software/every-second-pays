import { useUniwind } from "uniwind";
import { getThemeColors } from "../appearance/palettes";
import { useAppearanceStore } from "../appearance/store";

export function useEarningsTheme() {
    const { theme } = useUniwind();
    const palette = useAppearanceStore((state) => state.appearance.palette);
    const isDark = theme === "dark";
    return { isDark, colors: getThemeColors(palette, isDark) };
}
