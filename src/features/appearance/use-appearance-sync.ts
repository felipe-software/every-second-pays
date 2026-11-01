import { useEffect, useLayoutEffect } from "react";
import { Uniwind } from "uniwind";
import { getThemeColors, type PaletteId } from "./palettes";
import { useAppearanceStore } from "./store";

function applyPalette(palette: PaletteId) {
    for (const theme of ["light", "dark"] as const) {
        const colors = getThemeColors(palette, theme === "dark");
        const variables = Object.fromEntries(Object.entries(colors).map(([key, value]) => [
            `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value,
        ]));
        Uniwind.updateCSSVariables(theme, variables);
    }
}

export function useAppearanceSync() {
    const hydrated = useAppearanceStore((state) => state.hydrated);
    const load = useAppearanceStore((state) => state.load);
    useEffect(() => { void load(); }, [load]);
    useLayoutEffect(() => {
        const { appearance } = useAppearanceStore.getState();
        applyPalette(appearance.palette);
        Uniwind.setTheme(appearance.mode);
        // Synchronous with the store's set, so a change renders in one pass instead of a store pass followed by a theme pass.
        return useAppearanceStore.subscribe(({ appearance: next }, { appearance: previous }) => {
            if (next === previous) return;
            if (next.palette !== previous.palette) applyPalette(next.palette);
            if (next.mode !== previous.mode) Uniwind.setTheme(next.mode);
        });
    }, []);
    return hydrated;
}
