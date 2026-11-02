import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { PALETTES } from "@/features/appearance/palettes";
import { useI18n } from "@/features/i18n/i18n";

import { type ArtboardPoint, BAR, MODE_AT, swatchAt } from "./customize-layout";
import { CustomizeModeButton } from "./customize-mode-button";
import { CustomizePhonePreview } from "./customize-phone-preview";
import { CustomizeSwatch } from "./customize-swatch";
import { CustomizeTapDot } from "./customize-tap-dot";
import { type Look, useOnboardingTheme } from "./look";
import { rise } from "./motion";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

const PLAN = [1, 2, "mode", 3, 4, "mode", 0] as const;
const FIRST_TAP = 700;
const TAP_GAP = 1150;
const PRESS_AFTER = 400;

export function CustomizeStep({
    index,
    playing,
    reduced,
    board,
    onPreview,
    onPick,
}: {
    index: number;
    playing: boolean;
    reduced: boolean;
    board: Look;
    onPreview: (look: Look, at: ArtboardPoint) => void;
    onPick: (change: (current: Look) => Look, at: ArtboardPoint) => void;
}) {
    const { colors, look } = useOnboardingTheme();
    const { t } = useI18n();
    const [dot, setDot] = useState({ at: swatchAt(board.palette), shown: false, jump: true });
    const [presses, setPresses] = useState(0);
    const [picked, setPicked] = useState(false);
    const demo = playing && !reduced && !picked;

    const tapAt = useEffectEvent((step: (typeof PLAN)[number]) => {
        if (step === "mode") return { look: { ...look, dark: !look.dark }, at: MODE_AT };
        const start = Math.max(
            0,
            PALETTES.findIndex((item) => item.id === board.palette),
        );
        const palette = PALETTES[(start + step) % PALETTES.length].id;
        return { look: { ...look, palette }, at: swatchAt(palette) };
    });
    const preview = useEffectEvent(onPreview);

    useEffect(() => {
        if (!demo) return undefined;
        const timers: ReturnType<typeof setTimeout>[] = [];
        let tap = 0;
        const next = () => {
            const target = tapAt(PLAN[tap % PLAN.length]);
            setDot({ at: target.at, shown: true, jump: tap === 0 });
            tap += 1;
            timers.push(
                setTimeout(() => {
                    setPresses((count) => count + 1);
                    preview(target.look, target.at);
                    timers.push(setTimeout(next, TAP_GAP - PRESS_AFTER));
                }, PRESS_AFTER),
            );
        };
        timers.push(setTimeout(next, FIRST_TAP));
        return () => timers.forEach(clearTimeout);
    }, [demo]);

    const pick = (change: (current: Look) => Look, at: ArtboardPoint) => {
        setPicked(true);
        onPick(change, at);
    };

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art}>
                <CustomizePhonePreview />
                <Animated.View style={[styles.bar, rise(220, 26)]}>
                    <View
                        style={[styles.barFace, { backgroundColor: colors.raised, borderColor: colors.cardOutline }]}
                    />
                    <View accessibilityRole="radiogroup" style={StyleSheet.absoluteFill}>
                        {PALETTES.map((palette) => (
                            <CustomizeSwatch
                                key={palette.id}
                                palette={palette.id}
                                color={palette.accent}
                                selected={look.palette === palette.id}
                                onPress={() => {
                                    // A color keeps the mode on show, even one the demo switched to.
                                    pick((current) => ({ ...current, palette: palette.id }), swatchAt(palette.id));
                                }}
                            />
                        ))}
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.track }]} />
                    <CustomizeModeButton
                        onPress={() => {
                            pick((current) => ({ ...current, dark: !current.dark }), MODE_AT);
                        }}
                    />
                </Animated.View>
                <CustomizeTapDot at={dot.at} shown={demo && dot.shown} jump={dot.jump} presses={presses} />
            </PageLayer>
            <PageLayer index={index} depth={DEPTH.copy} passThrough>
                <StepCopy
                    top={516}
                    title={t("onboarding.customize.title")}
                    body={t("onboarding.customize.body")}
                    titleDelay={240}
                    bodyDelay={460}
                />
            </PageLayer>
        </>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: "absolute",
        left: BAR.x,
        top: 424,
        width: 320,
        height: 60,
    },
    barFace: {
        ...StyleSheet.absoluteFill,
        borderRadius: 30,
        borderWidth: 1,
    },
    divider: {
        position: "absolute",
        left: 250,
        top: 16,
        width: 1.5,
        height: 28,
        borderRadius: 1,
    },
});
