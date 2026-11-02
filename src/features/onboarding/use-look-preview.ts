import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createLookTransition, revealChange } from "theme-transition";

import type { Appearance } from "@/features/appearance/palettes";
import { useThemeHaptics } from "@/features/appearance/theme-haptics";

import type { ArtboardFit } from "./artboard-fit";
import type { ArtboardPoint } from "./customize-layout";
import { type Look, sameLook } from "./look";
import { CUSTOMIZE_PAGE } from "./onboarding-pages";
import { useArtLook } from "./use-art-look";

type LookPreviewOptions = {
    appLook: Look;
    updateAppearance: (change: Partial<Appearance>) => Promise<void>;
    step: number;
    exiting: boolean;
    reduced: boolean;
    window: { width: number; height: number };
    fit: ArtboardFit;
};

const onboardingLook = createLookTransition<Look>();

const lookFrameKey = ({ palette, dark }: Look) => `onboarding:${palette}:${dark}`;

export function useLookPreview({ appLook, updateAppearance, step, exiting, reduced, window, fit }: LookPreviewOptions) {
    const [preview, setPreview] = useState<Look | null>(null);
    // Uniwind reports a mode change after the store, so a picked look holds until it has.
    if (preview && sameLook(preview, appLook)) setPreview(null);
    const look = preview ?? appLook;
    const artLook = useArtLook(appLook, step);
    const modePicked = useRef(false);
    const themeHaptics = useThemeHaptics();

    const toScreen = (at: ArtboardPoint) => ({ x: fit.offsetX + at.x * fit.scale, y: fit.offsetY + at.y * fit.scale });
    const previewLook = (next: Look, at: ArtboardPoint) => {
        if (sameLook(next, look)) return;
        revealChange(() => setPreview(sameLook(next, appLook) ? null : next), toScreen(at), reduced);
    };
    const pickLook = (change: (current: Look) => Look, at: ArtboardPoint) => {
        const current = onboardingLook.shownLook(look);
        const next = change(current);
        if (sameLook(next, current)) return;
        if (next.dark !== current.dark) {
            modePicked.current = true;
            themeHaptics.mode();
        } else {
            themeHaptics.palette();
        }
        onboardingLook.transitionLook({
            look: next,
            from: lookFrameKey(look),
            to: lookFrameKey(next),
            apply: () => {
                setPreview(next);
                // Only an explicit mode change replaces "follow the system".
                const mode = modePicked.current ? { mode: next.dark ? ("dark" as const) : ("light" as const) } : {};
                updateAppearance({ palette: next.palette, ...mode }).catch(() => undefined);
            },
            origin: toScreen(at),
            reduceMotion: reduced,
        });
    };

    const unpreview = useEffectEvent(() => {
        if (preview && !exiting)
            revealChange(() => setPreview(null), { x: window.width / 2, y: window.height / 2 }, reduced);
    });
    useEffect(() => {
        if (step !== CUSTOMIZE_PAGE) unpreview();
    }, [step]);

    return { look, artLook, previewLook, pickLook };
}
