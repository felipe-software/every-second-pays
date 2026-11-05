import { Canvas, Skottie } from "@shopify/react-native-skia";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import {
    cancelAnimation,
    Easing,
    type SharedValue,
    useAnimatedReaction,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useLowEndDevice } from "@/features/device/low-end";
import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "../look";
import { afterFramesSettle, primeArt } from "./prime";
import { type Cue, type OnboardingAnimation, onboardingSkottie } from "./skottie";

export const FPS = 60;
// Every other frame, so slow phones draw the art at 30 fps.
const LOW_END_FRAME_STEP = 2;

function runTo(from: number, to: number) {
    "worklet";
    return withTiming(to, { duration: ((to - from) * 1000) / FPS, easing: Easing.linear });
}

export function useDrawnFrame(frame: SharedValue<number>, rest: number) {
    const lowEnd = useLowEndDevice();
    return useDerivedValue(() => {
        const current = frame.get();
        if (!lowEnd || current >= rest) return current;
        return Math.floor(current / LOW_END_FRAME_STEP) * LOW_END_FRAME_STEP;
    });
}

export function useArtVariants() {
    const { language, decimalSeparator } = useI18n();
    return useMemo(
        () => ({ lang: language, decimal: decimalSeparator === "," ? "," : "." }),
        [language, decimalSeparator],
    );
}

type CueReactionOptions = {
    frame: SharedValue<number>;
    cues: Cue[] | undefined;
    onCue: ((name: string, late: number) => void) | undefined;
    reduced: boolean;
    loopStart: number;
    loopEnd: number;
};

function useCueReaction({ frame, cues, onCue, reduced, loopStart, loopEnd }: CueReactionOptions) {
    // Both threads' `performance.now()` read the same clock.
    const cueCrossed = (name: string, crossedAt: number) => onCue?.(name, performance.now() - crossedAt);
    useAnimatedReaction(
        () => frame.get(),
        (current, previous) => {
            if (!cues || !onCue || previous == null || reduced) return;
            const now = performance.now();
            // A wrap crosses cues from `previous` to the loop's end and from its start to `current`.
            const wrapped = current < previous;
            for (const cue of cues) {
                const beforeWrap = wrapped && cue.frame > previous;
                const crossed = wrapped
                    ? beforeWrap || (cue.frame >= loopStart && cue.frame <= current)
                    : cue.frame > previous && cue.frame <= current;
                if (!crossed) continue;
                const since = beforeWrap ? loopEnd - cue.frame + current - loopStart : current - cue.frame;
                scheduleOnRN(cueCrossed, cue.name, now - (since * 1000) / FPS);
            }
        },
    );
}

export function StepArt({
    source,
    overlays,
    intro,
    loop,
    playing,
    reduced,
    replay = 0,
    frame: sharedFrame,
    cues,
    onCue,
    prime,
    onReady,
}: {
    source: OnboardingAnimation;
    overlays?: OnboardingAnimation[];
    intro: string;
    loop?: string;
    playing: boolean;
    reduced: boolean;
    replay?: number;
    frame?: SharedValue<number>;
    cues?: Cue[];
    onCue?: (name: string, late: number) => void;
    prime?: readonly number[];
    onReady?: () => Promise<void> | void;
}) {
    const { artLook: look } = useOnboardingTheme();
    const variants = useArtVariants();
    const animation = useMemo(() => onboardingSkottie(source, look, variants), [source, look, variants]);
    const overlaid = useMemo(
        () => overlays?.map((overlay) => onboardingSkottie(overlay, look, variants)) ?? [],
        [overlays, look, variants],
    );
    const [introStart, introEnd] = source.segments[intro];
    const loopSpan = loop ? source.segments[loop] : null;
    const settled = loopSpan ? loopSpan[0] : introEnd;
    const ownFrame = useSharedValue(reduced ? settled : introStart);
    const frame = sharedFrame ?? ownFrame;
    const drawnFrame = useDrawnFrame(frame, loopSpan ? Infinity : introEnd);

    const replayed = useRef(replay);

    const priming = !reduced && Boolean(prime?.length);
    const [primed, setPrimed] = useState(!priming);
    const getReady = useEffectEvent(() => {
        const ready = () => Promise.resolve(onReady?.());
        if (!priming) {
            void ready();
            return;
        }
        const playAfterFirstDraw = () => afterFramesSettle(() => setPrimed(true));
        const readyThenPlay = () => {
            void ready().finally(playAfterFirstDraw);
        };
        afterFramesSettle(() => primeArt([animation, ...overlaid], prime ?? [], readyThenPlay));
    });
    useEffect(() => getReady(), []);

    useEffect(() => {
        if (reduced) {
            cancelAnimation(frame);
            frame.set(settled);
            return undefined;
        }
        if (!playing || !primed) {
            cancelAnimation(frame);
            return undefined;
        }
        // Setting the frame first wouldn't rewind: it lands on the UI thread after this read.
        const rewind = replayed.current !== replay;
        replayed.current = replay;
        const now = rewind ? introStart : frame.get();
        const repeat = loopSpan
            ? withRepeat(withSequence(withTiming(loopSpan[0], { duration: 0 }), runTo(loopSpan[0], loopSpan[1])), -1)
            : null;
        const toEnd = rewind
            ? withSequence(withTiming(introStart, { duration: 0 }), runTo(now, introEnd))
            : runTo(now, introEnd);
        if (now < introEnd) frame.set(repeat ? withSequence(toEnd, repeat) : toEnd);
        else if (loopSpan && repeat)
            frame.set(now < loopSpan[1] ? withSequence(runTo(now, loopSpan[1]), repeat) : repeat);
        return () => cancelAnimation(frame);
    }, [frame, introEnd, introStart, loopSpan, playing, primed, reduced, replay, settled]);

    const [loopStart, loopEnd] = loopSpan ?? [introEnd, introEnd];
    useCueReaction({ frame, cues, onCue, reduced, loopStart, loopEnd });

    return (
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Skottie animation={animation} frame={drawnFrame} />
            {overlaid.map((overlay, index) => (
                <Skottie key={index} animation={overlay} frame={drawnFrame} />
            ))}
        </Canvas>
    );
}
