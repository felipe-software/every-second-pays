export const PALETTES = [
    { id: "orange", name: "Orange", accent: "#E8763A" },
    { id: "green", name: "Forest", accent: "#58AD85" },
    { id: "blue", name: "Ocean", accent: "#619FE5" },
    { id: "rose", name: "Rose", accent: "#D9829D" },
    { id: "lavender", name: "Lavender", accent: "#A38ADE" },
] as const;

export type PaletteId = typeof PALETTES[number]["id"];
export type ThemeMode = "system" | "light" | "dark";
export type Appearance = { mode: ThemeMode; palette: PaletteId };
export const DEFAULT_APPEARANCE: Appearance = { mode: "system", palette: "green" };

export function parseAppearance(value: unknown): Appearance {
    const data = value && typeof value === "object" ? value as Partial<Appearance> : {};
    return {
        mode: data.mode === "light" || data.mode === "dark" ? data.mode : "system",
        palette: PALETTES.some((palette) => palette.id === data.palette) ? data.palette! : "green",
    };
}

const LIGHT_COLORS = {
    canvas: "#FCF3EC",
    row: "#F1E8E1",
    active: "#F9DFD0",
    track: "#DCCFC3",
    ink: "#21180B",
    muted: "#4B3C2D",
    accent: "#E8763A",
    accentDeep: "#8E3C16",
    danger: "#A33A26",
} as const;

const DARK_COLORS = {
    canvas: "#1D1513",
    row: "#312A28",
    active: "#522E1D",
    track: "#695B57",
    ink: "#F4EDE8",
    muted: "#B0A093",
    accent: "#E8763A",
    accentDeep: "#EF9F75",
    danger: "#F08A7A",
} as const;

export type ThemeColors = { [Key in keyof typeof LIGHT_COLORS]: string };

const LIGHT_PALETTES = {
    orange: LIGHT_COLORS,
    green: {
        canvas: "#F0F7F3",
        row: "#E5ECE8",
        active: "#D8EAE0",
        track: "#CAD5CF",
        ink: "#131C17",
        muted: "#36433C",
        accent: "#58AD85",
        accentDeep: "#28664A",
        danger: LIGHT_COLORS.danger,
    },
    blue: {
        canvas: "#F0F5FC",
        row: "#E5EAF1",
        active: "#D9E6F7",
        track: "#CAD2DD",
        ink: "#131A23",
        muted: "#36404C",
        accent: "#619FE5",
        accentDeep: "#2E5A8B",
        danger: LIGHT_COLORS.danger,
    },
    rose: {
        canvas: "#FBF2F4",
        row: "#F0E7E9",
        active: "#F4DEE4",
        track: "#DBCED1",
        ink: "#211619",
        muted: "#4A3A3F",
        accent: "#D9829D",
        accentDeep: "#7F4356",
        danger: LIGHT_COLORS.danger,
    },
    lavender: {
        canvas: "#F5F4FB",
        row: "#EAE9F0",
        active: "#E6E2F5",
        track: "#D2CFDC",
        ink: "#1B1822",
        muted: "#403D4B",
        accent: "#A38ADE",
        accentDeep: "#5E4C86",
        danger: LIGHT_COLORS.danger,
    },
} satisfies Record<PaletteId, ThemeColors>;

const DARK_PALETTES = {
    orange: DARK_COLORS,
    green: {
        canvas: "#141816",
        row: "#292D2B",
        active: "#263F32",
        track: "#59615C",
        ink: "#EBF0ED",
        muted: "#9AA7A0",
        accent: "#58AD85",
        accentDeep: "#8CC4A7",
        danger: DARK_COLORS.danger,
    },
    blue: {
        canvas: "#14181C",
        row: "#292C30",
        active: "#273A50",
        track: "#595F67",
        ink: "#EBEFF4",
        muted: "#9BA4B0",
        accent: "#619FE5",
        accentDeep: "#8EB9EB",
        danger: DARK_COLORS.danger,
    },
    rose: {
        canvas: "#1B1517",
        row: "#2F2A2C",
        active: "#4B2F38",
        track: "#665C5E",
        ink: "#F3EDEE",
        muted: "#AE9FA3",
        accent: "#D9829D",
        accentDeep: "#DFA1B3",
        danger: DARK_COLORS.danger,
    },
    lavender: {
        canvas: "#18161C",
        row: "#2C2B30",
        active: "#3B344E",
        track: "#5F5D66",
        ink: "#EFEDF3",
        muted: "#A4A1AF",
        accent: "#A38ADE",
        accentDeep: "#BAAAE6",
        danger: DARK_COLORS.danger,
    },
} satisfies Record<PaletteId, ThemeColors>;

export function getThemeColors(palette: PaletteId, isDark: boolean): ThemeColors {
    return isDark ? DARK_PALETTES[palette] : LIGHT_PALETTES[palette];
}
