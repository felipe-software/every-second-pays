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
export const DEFAULT_APPEARANCE: Appearance = { mode: "system", palette: "orange" };

export function parseAppearance(value: unknown): Appearance {
    const data = value && typeof value === "object" ? value as Partial<Appearance> : {};
    return {
        mode: data.mode === "light" || data.mode === "dark" ? data.mode : "system",
        palette: PALETTES.some((palette) => palette.id === data.palette) ? data.palette! : "orange",
    };
}

const LIGHT_COLORS = {
    canvas: "#FCF3EC",
    sheet: "#F5EADF",
    raised: "#F1E5D8",
    row: "#F1E8E1",
    active: "#F9DFD0",
    field: "#E5CFB9",
    soft: "#E7D6C6",
    choice: "#F8F2EB",
    tokenActive: "#F3D7C7",
    track: "#DCCFC3",
    ink: "#21180B",
    muted: "#4B3C2D",
    accent: "#E8763A",
    accentDeep: "#8E3C16",
    danger: "#A33A26",
} as const;

const DARK_COLORS = {
    canvas: "#1D1513",
    sheet: "#2F2321",
    row: "#312A28",
    active: "#522E1D",
    raised: "#3A2D2B",
    field: "#382C2B",
    soft: "#403332",
    choice: "#493C3A",
    tokenActive: "#5D3528",
    track: "#695B57",
    ink: "#F4EDE8",
    muted: "#B0A093",
    accent: "#E8763A",
    accentDeep: "#EF9F75",
    danger: "#F08A7A",
} as const;

export type ThemeColors = { [Key in keyof typeof LIGHT_COLORS]: string };

function mix(base: string, accent: string, weight: number) {
    const channels = [1, 3, 5].map((offset) => {
        const a = parseInt(base.slice(offset, offset + 2), 16);
        const b = parseInt(accent.slice(offset, offset + 2), 16);
        return Math.round(a + (b - a) * weight).toString(16).padStart(2, "0");
    });
    return `#${channels.join("")}`;
}

export function getThemeColors(palette: PaletteId, isDark: boolean): ThemeColors {
    if (palette === "orange") return isDark ? DARK_COLORS : LIGHT_COLORS;
    const accent = PALETTES.find((item) => item.id === palette)!.accent;
    const base = isDark ? "#121416" : "#FFFFFF";
    const surface = (light: number, dark: number) => mix(base, accent, isDark ? dark : light);
    return {
        canvas: surface(0.06, 0.04), sheet: surface(0.12, 0.12), raised: surface(0.17, 0.17),
        row: surface(0.12, 0.13), active: surface(0.25, 0.30), field: surface(0.25, 0.21),
        soft: surface(0.21, 0.24), choice: surface(0.08, 0.28), tokenActive: surface(0.30, 0.34), track: surface(0.35, 0.40),
        ink: isDark ? mix("#FFFFFF", accent, 0.08) : mix("#101418", accent, 0.10),
        muted: isDark ? mix("#B8BEC5", accent, 0.15) : mix("#40464D", accent, 0.10),
        accent,
        accentDeep: isDark ? mix(accent, "#FFFFFF", 0.30) : mix(accent, "#000000", 0.50),
        danger: isDark ? DARK_COLORS.danger : LIGHT_COLORS.danger,
    };
}
