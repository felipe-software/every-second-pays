import { useUniwind } from "uniwind";
import { mixColors } from "../appearance/color";
import { getThemeColors, type PaletteId, type ThemeColors } from "../appearance/palettes";
import { useAppearanceStore } from "../appearance/store";

/**
 * The solid edge under a raised control: a darker shade of the control's own face.
 * Accent faces take a deeper shade so the edge still reads against the saturated color.
 * Dark faces use the same light touch: any deeper and the edge sinks below the canvas,
 * reading as a black shadow instead of the control's side.
 */
export function edgeColor(face: string, { accent = false } = {}) {
    return mixColors(face, "#000000", accent ? 0.24 : 0.14);
}

function deriveColors(base: ThemeColors, isDark: boolean) {
    // `row` barely separates from the canvas-colored sheet in light mode, so sheet controls
    // use a light ink tint there instead (about 1.18:1 against the sheet in every palette).
    // The tint is pre-blended so raised controls stay opaque over their own edge.
    const fill = isDark ? base.row : mixColors(base.canvas, base.ink, 0.08);
    // The bright card that groups the hours arc and its controls inside the payment sheet.
    const card = isDark ? mixColors(base.canvas, base.ink, 0.07) : mixColors(base.canvas, "#FFFFFF", 0.78);
    // The selected segment: the bright card in light mode, a lifted fill in dark mode.
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

/** Palette colors plus the surfaces and raised-control edges derived from them. */
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
