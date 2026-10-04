import { useUniwind } from "uniwind";
import { mixColors } from "../appearance/color";
import { getThemeColors } from "../appearance/palettes";
import { useAppearanceStore } from "../appearance/store";

export function useEarningsTheme() {
    const { theme } = useUniwind();
    const palette = useAppearanceStore((state) => state.appearance.palette);
    const isDark = theme === "dark";
    return { isDark, colors: getThemeColors(palette, isDark) };
}

// `row` barely separates from the canvas-colored sheet in light mode, so sheet controls
// use a light ink tint there instead (about 1.18:1 against the sheet in every palette).
// The tint is pre-blended so raised controls stay opaque over their own bottom edge.
export function useSheetFill() {
    const { isDark, colors } = useEarningsTheme();
    return isDark ? colors.row : mixColors(colors.canvas, colors.ink, 0.08);
}

/** The bright card that groups the hours dial and its controls inside the payment sheet. */
export function useSheetCard() {
    const { isDark, colors } = useEarningsTheme();
    return isDark ? mixColors(colors.canvas, colors.ink, 0.07) : mixColors(colors.canvas, "#FFFFFF", 0.78);
}

/**
 * The solid bottom edge under a raised control: a darker shade of the control's own face.
 * Accent faces take a deeper shade so the edge still reads against the saturated color.
 */
export function edgeColor(face: string, { accent = false, isDark = false } = {}) {
    return mixColors(face, "#000000", accent ? 0.24 : isDark ? 0.3 : 0.14);
}
