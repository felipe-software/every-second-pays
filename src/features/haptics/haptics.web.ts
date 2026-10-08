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

export type OnboardingHaptic =
    | "burst" | "impact" | "finale" | "column" | "month" | "bundle" | "pile" | "widget" | "lock" | "tick";

export function useOnboardingHaptics() {
    return (_haptic: OnboardingHaptic | "landing") => {};
}
