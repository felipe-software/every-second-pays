import type { Note } from "./score";

export const appHaptics = {
    press: () => {},
    selection: () => {},
    themeMode: () => {},
    primaryAction: () => {},
    secondaryAction: () => {},
    dismiss: () => {},
    destructiveAction: () => {},
};

export function useHapticsWarmup() {}

export function useMoneyLandingHaptic() {
    return () => {};
}

export type ScoreHaptic = null;

export function scoreHaptic(_score: readonly Note[]): ScoreHaptic {
    return null;
}

export function useScoreHaptic(_haptic: ScoreHaptic) {
    return { play: (_late?: number) => {}, stop: () => {} };
}

export type OnboardingHaptic = "widget" | "lock" | "tick";

export function useOnboardingHaptics() {
    return (_haptic: OnboardingHaptic | "landing") => {};
}
