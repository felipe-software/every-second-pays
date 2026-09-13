import { useEffect, useLayoutEffect } from "react";
import { Uniwind } from "uniwind";
import { getThemeColors } from "./palettes";
import { useAppearanceStore } from "./store";

export function useAppearanceSync() {
    const appearance = useAppearanceStore((state) => state.appearance);
    const hydrated = useAppearanceStore((state) => state.hydrated);
    const load = useAppearanceStore((state) => state.load);
    useEffect(() => { void load(); }, [load]);
    useLayoutEffect(() => {
        for (const theme of ["light", "dark"] as const) {
            const colors = getThemeColors(appearance.palette, theme === "dark");
            const variables = Object.fromEntries(Object.entries(colors).map(([key, value]) => [
                `--color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value,
            ]));
            Uniwind.updateCSSVariables(theme, variables);
        }
        Uniwind.setTheme(appearance.mode);
    }, [appearance]);
    return hydrated;
}
