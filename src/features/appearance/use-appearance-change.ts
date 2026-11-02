import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { createLookTransition, flushLookBurst } from "theme-transition";

import type { Appearance, PaletteId, ThemeMode } from "./palettes";
import { useAppearanceStore } from "./store";
import { useThemeHaptics } from "./theme-haptics";
import { type ThemeTransitionOrigin, useReduceMotion } from "./theme-transition";

const PALETTE_REVEAL_MS = 1000;

const settingsLook = createLookTransition<Appearance>();

const appearanceFrameKey = ({ palette, mode }: Appearance) => `settings:${palette}:${mode}`;

export function useAppearanceChange() {
    const appearance = useAppearanceStore((state) => state.appearance);
    const update = useAppearanceStore((state) => state.update);
    const reduceMotion = useReduceMotion();
    const themeHaptics = useThemeHaptics();
    const [saveError, setSaveError] = useState(false);

    const change = async (value: Appearance) => {
        setSaveError(false);
        try {
            await update(value);
        } catch {
            setSaveError(true);
        }
    };

    const changeLook = (picked: Partial<Appearance>, origin: ThemeTransitionOrigin, durationMs?: number) => {
        const next = { ...settingsLook.shownLook(appearance), ...picked };
        settingsLook.transitionLook({
            look: next,
            from: appearanceFrameKey(appearance),
            to: appearanceFrameKey(next),
            apply: () => {
                void change(next);
            },
            origin,
            reduceMotion,
            durationMs,
        });
    };

    const changeMode = (mode: ThemeMode, origin: ThemeTransitionOrigin) => {
        if (mode === settingsLook.shownLook(appearance).mode) return;
        themeHaptics.mode();
        changeLook({ mode }, origin);
    };

    const changePalette = (palette: PaletteId, origin: ThemeTransitionOrigin) => {
        if (palette === settingsLook.shownLook(appearance).palette) return;
        themeHaptics.palette();
        changeLook({ palette }, origin, PALETTE_REVEAL_MS);
    };

    useFocusEffect(useCallback(() => flushLookBurst, []));

    return { saveError, changeMode, changePalette };
}
