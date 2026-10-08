import { createContext, useContext } from "react";

import type { OnboardingHaptic } from "@/features/haptics/haptics";

type PlayHaptic = (haptic: OnboardingHaptic | "landing") => void;

/**
 * The onboarding's haptic patterns, parsed once for the whole walkthrough: parsing is a
 * synchronous native call, and each page parsing its own set stalled page changes.
 */
export const OnboardingHapticsContext = createContext<PlayHaptic>(() => {});

export function useOnboardingHaptic() {
    return useContext(OnboardingHapticsContext);
}
