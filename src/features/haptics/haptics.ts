import { Presets, Settings, usePatternComposer, type Pattern } from "react-native-pulsar";
import { useEffect } from "react";

const MONEY_LANDING_PATTERN: Pattern = {
    discretePattern: [
        { time: 0, amplitude: 0.22, frequency: 0.82 },
        { time: 52, amplitude: 0.1, frequency: 0.44 },
    ],
    continuousPattern: {
        amplitude: [],
        frequency: [],
    },
};

const PRELOADED_PRESETS = ["Cleave", "Push", "Snap", "Strike", "Wisp"];

export const appHaptics = {
    // Used when selecting palettes, chips, tokens, work hours, and time adjustments.
    selection: Presets.wisp,
    // Used when switching between the system, light, and dark appearance modes.
    themeMode: Presets.anvil,
    // Used by the primary action button in the payment sheet.
    primaryAction: Presets.strike,
    // Used when opening a source for editing or starting a new payment.
    secondaryAction: Presets.firecracker,
    // Used when closing the payment sheet without saving.
    dismiss: Presets.wisp,
    // Used when deleting an existing payment source.
    destructiveAction: Presets.buzz,
};

export function useHapticsWarmup() {
    useEffect(() => {
        Settings.enableCache(true);
        Settings.preloadPresets(PRELOADED_PRESETS);
    }, []);
}

export function useMoneyLandingHaptic() {
    // Used when a whole monetary unit lands in the animated earnings counter.
    return usePatternComposer(MONEY_LANDING_PATTERN).play;
}
