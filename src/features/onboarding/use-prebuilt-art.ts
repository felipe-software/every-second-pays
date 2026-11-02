import { useEffect } from "react";

import { onboardingSkottie } from "./art/skottie";
import { ONBOARDING_ART } from "./art/sources";
import { useArtVariants } from "./art/step-art";
import type { Look } from "./look";
import { PAGES } from "./onboarding-pages";

// Built while the intro's promise is read, so turning a page doesn't stall on it.
export function usePrebuiltArt(appLook: Look, introDone: boolean) {
    const artVariants = useArtVariants();
    useEffect(() => {
        if (!introDone) return undefined;
        const later = PAGES.filter((page) => page === "widget" || page === "privacy" || page === "notifications");
        const timers = later.map((page, order) =>
            setTimeout(() => onboardingSkottie(ONBOARDING_ART[page](), appLook, artVariants), 600 + order * 400),
        );
        return () => timers.forEach(clearTimeout);
    }, [appLook, artVariants, introDone]);
}
