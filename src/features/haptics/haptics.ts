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
            frequency: rumble.length ? [{ time: 0, value: pitch }, { time: rumble.at(-1)![0], value: pitch }] : [],
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

// The device's own primitives where it has them all: tuned to its actuator, they feel crisper
// than any waveform.
export function scoreHaptic(score: readonly Note[]): ScoreHaptic {
    if (PLAYER && DURATIONS && canCompose(score, DURATIONS)) return { kind: "composition", score, durations: DURATIONS };
    const pattern = toPattern(score);
    return WAVEFORM ? { kind: "waveform", waveform: toWaveform(pattern) } : { kind: "pattern", pattern };
}

export function useScoreHaptic(haptic: ScoreHaptic) {
    const composer = usePatternComposer(haptic.kind === "pattern" ? haptic.pattern : SILENT);
    // `late`: how far into the score it already is; only a composition can start partway.
    const play = (late = 0) => {
        if (haptic.kind === "composition") PLAYER?.playScore(toChunks(haptic.score, haptic.durations, late));
        else if (haptic.kind === "waveform") WAVEFORM?.playWaveform(haptic.waveform.timings, haptic.waveform.amplitudes);
        else composer.play();
    };
    const stop = () => {
        if (haptic.kind === "pattern") composer.stop();
        else PLAYER?.stop();
    };
    return { play, stop };
}

const MONEY_LANDING = haptic([[0, 0.7, 0.8]], [[0, 0.45], [70, 0]], 0.6);

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

// Timings mirror the onboarding animations they accompany; keep them in sync with
// `src/features/onboarding`.
const ONBOARDING_HAPTICS = {
    // The widget settling into its home screen slot, then its small rebound.
    widget: haptic([[0, 0.9, 0.5], [180, 0.5, 0.5]], [[0, 0.6], [140, 0.2], [180, 0.45], [320, 0]]),
    // The padlock's shackle snapping shut.
    lock: haptic([[0, 1, 0.95], [60, 0.6, 0.6]], [[0, 0.5], [160, 0]], 0.7),
    // A privacy promise checking off.
    tick: haptic([[0, 0.6, 0.85]], [[0, 0.3], [50, 0]], 0.7),
};

export type OnboardingHaptic = keyof typeof ONBOARDING_HAPTICS;

export function useOnboardingHaptics() {
    // Each player is stable, so the returned function is too.
    const widget = useHaptic(ONBOARDING_HAPTICS.widget);
    const lock = useHaptic(ONBOARDING_HAPTICS.lock);
    const tick = useHaptic(ONBOARDING_HAPTICS.tick);
    const landing = useMoneyLandingHaptic();
    return useCallback((name: OnboardingHaptic | "landing") => {
        const plays = { widget, lock, tick, landing };
        plays[name]();
    }, [widget, lock, tick, landing]);
}
