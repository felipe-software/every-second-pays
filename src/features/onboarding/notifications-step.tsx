import { useEffect, useEffectEvent, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useScoreHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { ONBOARDING_ART } from "./art/sources";
import { StepArt } from "./art/step-art";
import { BELL_HAPTICS } from "./bell-haptics";
import type { BellCue } from "./bell-timeline";
import { useOnboardingTheme } from "./look";
import { rise } from "./motion";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

export type NotificationAnswer = "ask" | "allowed" | "declined";

const SCENES: Record<NotificationAnswer, { intro: string; loop?: string; cues: readonly BellCue[] }> = {
    ask: { intro: "intro", loop: "loop", cues: ["enter", "ask"] },
    allowed: { intro: "allowed", cues: ["allowed"] },
    declined: { intro: "declined", cues: ["declined"] },
};

export function NotificationsStep({
    index,
    playing,
    reduced,
    answer,
}: {
    index: number;
    playing: boolean;
    reduced: boolean;
    answer: NotificationAnswer;
}) {
    const { t } = useI18n();
    const { colors } = useOnboardingTheme();
    const art = ONBOARDING_ART.notifications();
    const scene = SCENES[answer];
    // Only this scene's: answering jumps the timeline forward, past the moments of the others.
    const cues = useMemo(
        () => art.cues.filter((cue) => (scene.cues as readonly string[]).includes(cue.name)),
        [art, scene],
    );

    const haptics: Record<BellCue, ReturnType<typeof useScoreHaptic>> = {
        enter: useScoreHaptic(BELL_HAPTICS.enter),
        ask: useScoreHaptic(BELL_HAPTICS.ask),
        allowed: useScoreHaptic(BELL_HAPTICS.allowed),
        declined: useScoreHaptic(BELL_HAPTICS.declined),
    };

    const stopHaptics = useEffectEvent(() => Object.values(haptics).forEach((haptic) => haptic.stop()));
    useEffect(() => {
        if (playing) return () => stopHaptics();
    }, [answer, playing]);

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} passThrough>
                <StepArt
                    source={art}
                    intro={scene.intro}
                    loop={scene.loop}
                    playing={playing}
                    reduced={reduced}
                    replay={answer === "ask" ? 0 : 1}
                    cues={cues}
                    onCue={(name, late) => {
                        if (playing) haptics[name as BellCue].play(late);
                    }}
                />
                <View
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={t("onboarding.notifications.accessibility")}
                    style={styles.bell}
                />
            </PageLayer>
            <PageLayer index={index} depth={DEPTH.copy} passThrough>
                <StepCopy
                    top={560}
                    title={t("onboarding.notifications.title")}
                    body={t("onboarding.notifications.body")}
                    titleDelay={240}
                    bodyDelay={460}
                >
                    {answer === "declined" ? (
                        <Animated.Text
                            accessibilityLiveRegion="polite"
                            style={[styles.later, { color: colors.muted }, rise(0, 10)]}
                        >
                            {t("onboarding.notifications.later")}
                        </Animated.Text>
                    ) : null}
                </StepCopy>
            </PageLayer>
        </>
    );
}

const styles = StyleSheet.create({
    bell: {
        position: "absolute",
        left: 70,
        top: 240,
        width: 272,
        height: 220,
    },
    later: {
        marginTop: 12,
        maxWidth: 320,
        fontFamily: "Archivo-Medium",
        fontSize: 13.5,
        lineHeight: 18,
        textAlign: "center",
    },
});
