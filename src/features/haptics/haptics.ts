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

const PRELOADED_PRESETS = ["Anvil", "Buzz", "Firecracker", "Strike", "Wisp"];

export const appHaptics = {
    press: Presets.System.impactLight,
    selection: Presets.wisp,
    themeMode: Presets.anvil,
    primaryAction: Presets.strike,
    secondaryAction: Presets.firecracker,
    dismiss: Presets.wisp,
    destructiveAction: Presets.buzz,
};

export function useHapticsWarmup() {
    useEffect(() => {
        Settings.enableCache(true);
        Settings.preloadPresets(PRELOADED_PRESETS);
    }, []);
}

export function useMoneyLandingHaptic() {
    return usePatternComposer(MONEY_LANDING_PATTERN).play;
}
