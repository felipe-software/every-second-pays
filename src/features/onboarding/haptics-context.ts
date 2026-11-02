import { createContext, useContext } from "react";

import type { OnboardingHaptic } from "@/features/haptics/haptics";

export type PlayHaptic = (haptic: OnboardingHaptic | "landing") => void;

// Parsed once for the walkthrough: parsing is a sync native call, and per-page sets stalled turns.
export const OnboardingHapticsContext = createContext<PlayHaptic>(() => {});

export function useOnboardingHaptic() {
    return useContext(OnboardingHapticsContext);
}
