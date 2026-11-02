import { PALETTES, type PaletteId } from "@/features/appearance/palettes";

export type ArtboardPoint = { x: number; y: number };

export const BAR = { x: 46, y: 454 } as const;
export const SWATCH_X = [78, 124, 170, 216, 262] as const;
export const MODE_AT: ArtboardPoint = { x: 332, y: 454 };

export const swatchAt = (palette: PaletteId): ArtboardPoint => ({
    x: SWATCH_X[PALETTES.findIndex((item) => item.id === palette)],
    y: BAR.y,
});
