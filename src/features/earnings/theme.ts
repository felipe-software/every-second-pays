import type { TextStyle } from "react-native";
import { useUniwind } from "uniwind";
import { mixColors } from "../appearance/color";
import { getThemeColors, type PaletteId, type ThemeColors } from "../appearance/palettes";
import { useAppearanceStore } from "../appearance/store";

// Dark faces keep the same light shade: any deeper and the edge reads as a black shadow.
export function edgeColor(face: string, { accent = false } = {}) {
    return mixColors(face, "#000000", accent ? 0.24 : 0.14);
}

// Light text on the accent is only about 2.5:1 in light mode, so the shadow carries its legibility.
const LIGHT_ON_ACCENT_SHADOW: TextStyle = {
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
};

function deriveColors(base: ThemeColors, isDark: boolean) {
    // Light-mode `row` barely separates from the sheet, so use a pre-blended (opaque) ink tint.
    const fill = isDark ? base.row : mixColors(base.canvas, base.ink, 0.08);
    const card = isDark ? mixColors(base.canvas, base.ink, 0.07) : mixColors(base.canvas, "#FFFFFF", 0.78);
    const raised = isDark ? mixColors(fill, base.ink, 0.12) : card;
    const chipSelected = mixColors(card, base.accent, 0.28);
    const chipSelectedBorder = mixColors(card, base.accent, isDark ? 0.62 : 0.6);
    const cardFace = isDark ? base.row : raised;
    const dangerFace = mixColors(base.canvas, base.danger, 0.1);
    // Matches EarningsBackground's blurred top; keep in sync with its glow opacities.
    const canvasGlow = mixColors(mixColors(base.canvas, base.accent, 0.078), base.row, isDark ? 0.405 : 0.26);

    return {
        ...base,
        fill,
        card,
        raised,
        chipSelected,
        chipSelectedBorder,
        dangerFace,
        canvasGlow,
        cardFace,
        cardOutline: isDark ? edgeColor(base.row) : base.track,
        edgeRow: edgeColor(base.row),
        edgeActive: edgeColor(base.active),
        edgeFill: edgeColor(fill),
        edgeCanvas: edgeColor(base.canvas),
        edgeRaised: edgeColor(raised),
        edgeChip: edgeColor(chipSelected),
        edgeDanger: edgeColor(dangerFace),
        edgeAccent: edgeColor(base.accent, { accent: true }),
        onAccent: base.canvas,
        onAccentText: isDark ? { color: base.canvas } : { color: base.canvas, ...LIGHT_ON_ACCENT_SHADOW },
    };
}

export type EarningsColors = ReturnType<typeof deriveColors>;

const derivedColors = new Map<string, EarningsColors>();

export function getEarningsColors(palette: PaletteId, isDark: boolean) {
    const key = `${palette}:${isDark ? "dark" : "light"}`;
    let colors = derivedColors.get(key);
    if (!colors) {
        colors = deriveColors(getThemeColors(palette, isDark), isDark);
        derivedColors.set(key, colors);
    }
    return colors;
}

export function useEarningsTheme() {
    const { theme } = useUniwind();
    const palette = useAppearanceStore((state) => state.appearance.palette);
    const isDark = theme === "dark";
    return { isDark, colors: getEarningsColors(palette, isDark) };
}
