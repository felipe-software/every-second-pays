import { requireOptionalNativeModule } from "expo";
import { Presets, Settings, usePatternComposer, type Pattern } from "react-native-pulsar";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

import { canCompose, type Chunk, type Note, type PrimitiveDurations, toChunks, toPattern } from "./score";
import { toWaveform, type Waveform } from "./waveform";

type HapticPlayerModule = {
    hasAmplitudeControl(): boolean;
    playWaveform(timings: number[], amplitudes: number[]): void;
    primitiveDurations(): PrimitiveDurations | null;
    playScore(chunks: Chunk[]): void;
    stop(): void;
};

const PLAYER = Platform.OS === "android" ? requireOptionalNativeModule<HapticPlayerModule>("HapticPlayer") : null;
// Pulsar's Android player cuts a rumble into coarse steps and drops the hits laid over it.
const WAVEFORM = PLAYER?.hasAmplitudeControl() ? PLAYER : null;
const DURATIONS = PLAYER?.primitiveDurations() ?? null;

const SILENT: Pattern = { discretePattern: [], continuousPattern: { amplitude: [], frequency: [] } };

type Haptic = { pattern: Pattern; playWaveform: () => void };

type Hit = [time: number, amplitude: number, frequency: number];

function haptic(hits: Hit[], rumble: [time: number, level: number][] = [], pitch = 0.4): Haptic {
    const pattern: Pattern = {
        discretePattern: hits.map(([time, amplitude, frequency]) => ({ time, amplitude, frequency })),
        continuousPattern: {
            amplitude: rumble.map(([time, value]) => ({ time, value })),
            frequency: rumble.length
                ? [
                      { time: 0, value: pitch },
                      { time: rumble.at(-1)![0], value: pitch },
                  ]
                : [],
        },
    };
    const { timings, amplitudes } = toWaveform(pattern);
    return { pattern, playWaveform: () => WAVEFORM?.playWaveform(timings, amplitudes) };
}

function useHaptic({ pattern, playWaveform }: Haptic) {
    const play = usePatternComposer(WAVEFORM ? SILENT : pattern).play;
    return WAVEFORM ? playWaveform : play;
}

export type ScoreHaptic =
    | { kind: "composition"; score: readonly Note[]; durations: PrimitiveDurations }
    | { kind: "waveform"; waveform: Waveform }
    | { kind: "pattern"; pattern: Pattern };

// A device's own primitives are tuned to its actuator, so they feel crisper than any waveform.
export function scoreHaptic(score: readonly Note[]): ScoreHaptic {
    if (PLAYER && DURATIONS && canCompose(score, DURATIONS))
        return { kind: "composition", score, durations: DURATIONS };
    const pattern = toPattern(score);
    return WAVEFORM ? { kind: "waveform", waveform: toWaveform(pattern) } : { kind: "pattern", pattern };
}

export function useScoreHaptic(scored: ScoreHaptic) {
    const composer = usePatternComposer(scored.kind === "pattern" ? scored.pattern : SILENT);
    // Only a composition can start partway through the score; the others ignore `late`.
    const play = (late = 0) => {
        if (scored.kind === "composition") PLAYER?.playScore(toChunks(scored.score, scored.durations, late));
        else if (scored.kind === "waveform")
            WAVEFORM?.playWaveform(scored.waveform.timings, scored.waveform.amplitudes);
        else composer.play();
    };
    const stop = () => {
        if (scored.kind === "pattern") composer.stop();
        else PLAYER?.stop();
    };
    return { play, stop };
}

const MONEY_LANDING = haptic(
    [[0, 0.7, 0.8]],
    [
        [0, 0.45],
        [70, 0],
    ],
    0.6,
);

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
    return useHaptic(MONEY_LANDING);
}

// Timings mirror the onboarding animations; keep them in sync with `src/features/onboarding`.
const ONBOARDING_HAPTICS = {
    widget: haptic(
        [
            [0, 0.9, 0.5],
            [180, 0.5, 0.5],
        ],
        [
            [0, 0.6],
            [140, 0.2],
            [180, 0.45],
            [320, 0],
        ],
    ),
    lock: haptic(
        [
            [0, 1, 0.95],
            [60, 0.6, 0.6],
        ],
        [
            [0, 0.5],
            [160, 0],
        ],
        0.7,
    ),
    tick: haptic(
        [[0, 0.6, 0.85]],
        [
            [0, 0.3],
            [50, 0],
        ],
        0.7,
    ),
};

export type OnboardingHaptic = keyof typeof ONBOARDING_HAPTICS;

export function useOnboardingHaptics() {
    const widget = useHaptic(ONBOARDING_HAPTICS.widget);
    const lock = useHaptic(ONBOARDING_HAPTICS.lock);
    const tick = useHaptic(ONBOARDING_HAPTICS.tick);
    const landing = useMoneyLandingHaptic();
    return useCallback(
        (name: OnboardingHaptic | "landing") => {
            const plays = { widget, lock, tick, landing };
            plays[name]();
        },
        [widget, lock, tick, landing],
    );
}
