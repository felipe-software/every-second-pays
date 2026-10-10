import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { PaletteId } from "@/features/appearance/palettes";
import { getEarningsColors } from "@/features/earnings/theme";

/** A palette in light or dark mode: what the onboarding is painted in. */
export type Look = { palette: PaletteId; dark: boolean };

export const sameLook = (a: Look, b: Look) => a.palette === b.palette && a.dark === b.dark;

type OnboardingTheme = {
    look: Look;
    /**
     * The look the step illustrations wear. While the customization step previews looks it stays
     * on the settled one: those illustrations are off screen, and rebuilding them per tap is waste.
     */
    artLook: Look;
    isDark: boolean;
    colors: ReturnType<typeof getEarningsColors>;
};

const LookContext = createContext<OnboardingTheme | null>(null);

/**
 * The onboarding's own look. It's the app's until the customization step previews others, so a
 * preview recolors only the onboarding and not the whole app underneath it.
 */
export function OnboardingLookProvider({ look, artLook, children }: { look: Look; artLook: Look; children: ReactNode }) {
    const value = useMemo(
        () => ({ look, artLook, isDark: look.dark, colors: getEarningsColors(look.palette, look.dark) }),
        [artLook, look],
    );
    return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useOnboardingTheme() {
    const theme = useContext(LookContext);
    if (!theme) throw new Error("useOnboardingTheme must be used inside the onboarding");
    return theme;
}
