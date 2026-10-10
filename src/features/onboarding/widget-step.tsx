import { StyleSheet, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { ONBOARDING_ART } from "./art/sources";
import { StepArt } from "./art/step-art";
import { useOnboardingHaptic } from "./haptics-context";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

/** Step two: a phone's home screen gets the widget, which counts as money flies into it. */
export function WidgetStep({ index, playing, reduced }: { index: number; playing: boolean; reduced: boolean }) {
    const { t } = useI18n();
    const art = ONBOARDING_ART.widget();
    const haptic = useOnboardingHaptic();
    const cue = (name: string) => {
        if (!playing) return;
        if (name === "settle") haptic("widget");
        else if (name === "landing") haptic("landing");
    };

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} passThrough>
                <StepArt source={art} intro="intro" loop="loop" playing={playing} reduced={reduced} cues={art.cues} onCue={cue} />
                <View
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={t("onboarding.widget.accessibility")}
                    style={styles.phone}
                />
            </PageLayer>
            <PageLayer index={index} depth={DEPTH.copy} passThrough>
                <StepCopy
                    top={620}
                    title={t("onboarding.widget.title")}
                    body={t("onboarding.widget.body")}
                    titleDelay={260}
                    bodyDelay={480}
                />
            </PageLayer>
        </>
    );
}

const styles = StyleSheet.create({
    phone: {
        position: "absolute",
        left: 80,
        top: 84,
        width: 252,
        height: 500,
    },
});
