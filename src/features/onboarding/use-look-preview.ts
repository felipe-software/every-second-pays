import { useEffect, useEffectEvent, useState } from "react";

import type { Appearance } from "@/features/appearance/palettes";
import { runInterfaceTransition } from "@/features/appearance/theme-transition";

import type { ArtboardFit } from "./artboard-fit";
import type { ArtboardPoint } from "./customize-layout";
import { type Look, sameLook } from "./look";
import { CUSTOMIZE_PAGE } from "./onboarding-pages";

type LookPreviewOptions = {
    appLook: Look;
    updateAppearance: (change: Partial<Appearance>) => Promise<void>;
    step: number;
    exiting: boolean;
    reduced: boolean;
    window: { width: number; height: number };
    fit: ArtboardFit;
};

export function useLookPreview({ appLook, updateAppearance, step, exiting, reduced, window, fit }: LookPreviewOptions) {
    const [preview, setPreview] = useState<Look | null>(null);
    const look = preview ?? appLook;

    const toScreen = (at: ArtboardPoint) => ({ x: fit.offsetX + at.x * fit.scale, y: fit.offsetY + at.y * fit.scale });
    const previewLook = (next: Look, at: ArtboardPoint) => {
        if (sameLook(next, look)) return;
        runInterfaceTransition(() => setPreview(sameLook(next, appLook) ? null : next), toScreen(at), reduced);
    };
    const pickLook = (next: Look, at: ArtboardPoint) => {
        runInterfaceTransition(
            () => {
                setPreview(null);
                // Only an explicit mode change replaces "follow the system".
                const mode =
                    next.dark === appLook.dark ? {} : { mode: next.dark ? ("dark" as const) : ("light" as const) };
                updateAppearance({ palette: next.palette, ...mode }).catch(() => undefined);
            },
            toScreen(at),
            reduced,
        );
    };

    const unpreview = useEffectEvent(() => {
        if (preview && !exiting)
            runInterfaceTransition(() => setPreview(null), { x: window.width / 2, y: window.height / 2 }, reduced);
    });
    useEffect(() => {
        if (step !== CUSTOMIZE_PAGE) unpreview();
    }, [step]);

    return { look, previewLook, pickLook };
}
