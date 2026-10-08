import { Canvas, Skottie } from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import {
    cancelAnimation,
    Easing,
    useAnimatedReaction,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "../look";
import { type Cue, type OnboardingAnimation, onboardingSkottie } from "./skottie";

/** The frame rate every onboarding animation is exported at. */
const FPS = 60;

function runTo(from: number, to: number) {
    "worklet";
    return withTiming(to, { duration: ((to - from) * 1000) / FPS, easing: Easing.linear });
}

/**
 * A step's illustration, drawn by Skia's Skottie from the exported design animation and laid
 * over the artboard. It plays the `intro` segment once, then repeats `loop`; it pauses while
 * `playing` is off and resumes where it stopped. With reduced motion it shows the settled frame.
 */
/** The text variants the illustrations take: the reader's language and decimal separator. */
export function useArtVariants() {
    const { language, decimalSeparator } = useI18n();
    return useMemo(() => ({ lang: language, decimal: decimalSeparator === "," ? "," : "." }), [language, decimalSeparator]);
}

export function StepArt({
    source,
    intro,
    loop,
    playing,
    reduced,
    cues,
    onCue,
}: {
    source: OnboardingAnimation;
    intro: string;
    loop?: string;
    playing: boolean;
    reduced: boolean;
    /** Moments to act on (haptics), by frame. */
    cues?: Cue[];
    onCue?: (name: string) => void;
}) {
    const { artLook: look } = useOnboardingTheme();
    const variants = useArtVariants();
    const animation = useMemo(() => onboardingSkottie(source, look, variants), [source, look, variants]);
    const [introStart, introEnd] = source.segments[intro];
    const loopSpan = loop ? source.segments[loop] : null;
    const settled = loopSpan ? loopSpan[0] : introEnd;
    const frame = useSharedValue(reduced ? settled : introStart);

    useEffect(() => {
        if (reduced) {
            cancelAnimation(frame);
            frame.set(settled);
            return;
        }
        if (!playing) {
            cancelAnimation(frame);
            return;
        }
        const now = frame.get();
        const repeat = loopSpan
            ? withRepeat(withSequence(withTiming(loopSpan[0], { duration: 0 }), runTo(loopSpan[0], loopSpan[1])), -1)
            : null;
        if (now < introEnd) frame.set(repeat ? withSequence(runTo(now, introEnd), repeat) : runTo(now, introEnd));
        else if (loopSpan && repeat) frame.set(now < loopSpan[1] ? withSequence(runTo(now, loopSpan[1]), repeat) : repeat);
        return () => cancelAnimation(frame);
    }, [frame, introEnd, loopSpan, playing, reduced, settled]);

    const loopStart = loopSpan ? loopSpan[0] : introEnd;
    useAnimatedReaction(
        () => frame.get(),
        (current, previous) => {
            if (!cues || !onCue || previous == null || reduced) return;
            // The loop jumping back to its start runs on from there, so cues past `previous`
            // to the loop's end and from its start up to `current` have both been crossed.
            const wrapped = current < previous;
            for (const cue of cues) {
                const crossed = wrapped
                    ? cue.frame > previous || (cue.frame >= loopStart && cue.frame <= current)
                    : cue.frame > previous && cue.frame <= current;
                if (crossed) scheduleOnRN(onCue, cue.name);
            }
        },
    );

    return (
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Skottie animation={animation} frame={frame} />
        </Canvas>
    );
}
