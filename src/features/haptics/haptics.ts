import { Presets, Settings, usePatternComposer, type Pattern } from "react-native-pulsar";
import { useCallback, useEffect } from "react";

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

function taps(count: number, gap: number, amplitude: number, frequency: number): Pattern {
    return {
        discretePattern: Array.from({ length: count }, (_, index) => ({ time: index * gap, amplitude, frequency })),
        continuousPattern: { amplitude: [], frequency: [] },
    };
}

function hits(...events: [time: number, amplitude: number, frequency: number][]): Pattern {
    return {
        discretePattern: events.map(([time, amplitude, frequency]) => ({ time, amplitude, frequency })),
        continuousPattern: { amplitude: [], frequency: [] },
    };
}

// Timings mirror the onboarding animations they accompany; keep them in sync with
// `src/features/onboarding`.
const ONBOARDING_PATTERNS = {
    // The bird bursting into the day's eight bills.
    burst: hits([0, 0.55, 0.9], [45, 0.22, 0.7]),
    // The counter swallowing a day, a week or a month.
    impact: hits([0, 0.6, 0.45], [70, 0.2, 0.3]),
    // The counter swallowing a whole year, after the last bundle lands.
    finale: {
        discretePattern: [
            { time: 0, amplitude: 1, frequency: 0.5 },
            { time: 110, amplitude: 0.5, frequency: 0.35 },
            { time: 230, amplitude: 0.28, frequency: 0.3 },
        ],
        continuousPattern: {
            amplitude: [{ time: 0, value: 0 }, { time: 30, value: 0.4 }, { time: 600, value: 0 }],
            frequency: [{ time: 0, value: 0.3 }, { time: 600, value: 0.2 }],
        },
    },
    // A weekday's eight bills landing in its column, 42 ms apart.
    column: taps(8, 42, 0.16, 0.8),
    // The rest of the month's seventeen workdays filling, 46 ms apart.
    month: taps(17, 46, 0.14, 0.75),
    // January's bundle snapping its strap closed.
    bundle: hits([0, 0.4, 0.6]),
    // The other eleven months landing on the pile, 60 ms apart.
    pile: taps(11, 60, 0.3, 0.25),
    // The widget settling into its home screen slot, then its small rebound.
    widget: hits([0, 0.7, 0.35], [180, 0.22, 0.5]),
    // The padlock's shackle snapping shut.
    lock: hits([0, 0.9, 0.95], [60, 0.35, 0.6]),
    // A privacy promise checking off.
    tick: hits([0, 0.3, 0.85]),
} satisfies Record<string, Pattern>;

export type OnboardingHaptic = keyof typeof ONBOARDING_PATTERNS;

export function useOnboardingHaptics() {
    // Each composer's `play` is stable, so the returned function is too.
    const burst = usePatternComposer(ONBOARDING_PATTERNS.burst).play;
    const impact = usePatternComposer(ONBOARDING_PATTERNS.impact).play;
    const finale = usePatternComposer(ONBOARDING_PATTERNS.finale).play;
    const column = usePatternComposer(ONBOARDING_PATTERNS.column).play;
    const month = usePatternComposer(ONBOARDING_PATTERNS.month).play;
    const bundle = usePatternComposer(ONBOARDING_PATTERNS.bundle).play;
    const pile = usePatternComposer(ONBOARDING_PATTERNS.pile).play;
    const widget = usePatternComposer(ONBOARDING_PATTERNS.widget).play;
    const lock = usePatternComposer(ONBOARDING_PATTERNS.lock).play;
    const tick = usePatternComposer(ONBOARDING_PATTERNS.tick).play;
    const landing = useMoneyLandingHaptic();
    return useCallback((haptic: OnboardingHaptic | "landing") => {
        const plays = { burst, impact, finale, column, month, bundle, pile, widget, lock, tick, landing };
        plays[haptic]();
    }, [burst, impact, finale, column, month, bundle, pile, widget, lock, tick, landing]);
}
