import { useUniwind } from "uniwind";
import { mixColors } from "../appearance/color";
import { getThemeColors, type PaletteId, type ThemeColors } from "../appearance/palettes";
import { useAppearanceStore } from "../appearance/store";

// Dark faces keep the same light shade: any deeper and the edge reads as a black shadow.
export function edgeColor(face: string, { accent = false } = {}) {
    return mixColors(face, "#000000", accent ? 0.24 : 0.14);
}

function deriveColors(base: ThemeColors, isDark: boolean) {
    // Light-mode `row` barely separates from the sheet, so use a pre-blended (opaque) ink tint.
    const fill = isDark ? base.row : mixColors(base.canvas, base.ink, 0.08);
    const card = isDark ? mixColors(base.canvas, base.ink, 0.07) : mixColors(base.canvas, "#FFFFFF", 0.78);
    const raised = isDark ? mixColors(fill, base.ink, 0.12) : card;
    const chipSelected = mixColors(card, base.accent, 0.28);
    const dangerFace = mixColors(base.canvas, base.danger, 0.1);

    return {
        ...base,
        fill,
        card,
        raised,
        chipSelected,
        dangerFace,
        edgeRow: edgeColor(base.row),
        edgeActive: edgeColor(base.active),
        edgeFill: edgeColor(fill),
        edgeCanvas: edgeColor(base.canvas),
        edgeRaised: edgeColor(raised),
        edgeChip: edgeColor(chipSelected),
        edgeDanger: edgeColor(dangerFace),
        edgeAccent: edgeColor(base.accent, { accent: true }),
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
