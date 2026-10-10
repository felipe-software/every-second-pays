import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { type CSSTransitionProperties, css, cubicBezier } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { mixColors, withAlpha } from "@/features/appearance/color";
import { PALETTES, type PaletteId } from "@/features/appearance/palettes";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { type Look, useOnboardingTheme } from "./look";
import { EASE_BOUNCY, EASE_SPRING, rise } from "./motion";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

/** A point on the design artboard. */
export type ArtboardPoint = { x: number; y: number };

const BAR = { x: 46, y: 454 } as const;
const SWATCH_X = [78, 124, 170, 216, 262] as const;
const MODE_AT: ArtboardPoint = { x: 332, y: 454 };
// The demo taps on until someone picks a look themselves: the next two colors, the mode, the
// next two, the mode again, and back to the color it started on.
const PLAN = [1, 2, "mode", 3, 4, "mode", 0] as const;
const FIRST_TAP = 700;
const TAP_GAP = 1150;
/** The finger lands this long after it starts moving to a control. */
const PRESS_AFTER = 400;

const SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [200, 420],
    transitionTimingFunction: ["ease", EASE_BOUNCY],
};
const ICON_SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [260, 520],
    transitionTimingFunction: ["ease", EASE_SPRING],
};
const TAP = css.keyframes({
    "0%": { transform: [{ scale: 1 }] },
    "35%": { transform: [{ scale: 0.7 }] },
    "100%": { transform: [{ scale: 1 }] },
});
const RIPPLE = css.keyframes({
    from: { opacity: 0.8, transform: [{ scale: 0.7 }] },
    to: { opacity: 0, transform: [{ scale: 1.9 }] },
});

/** The app's Today screen in miniature, in whatever look the onboarding wears. */
function PhonePreview() {
    const { colors, look } = useOnboardingTheme();
    const { t, formatMoney } = useI18n();
    const name = t(`palette.${look.palette}`);
    const mode = t(look.dark ? "settings.mode.dark" : "settings.mode.light").toLocaleLowerCase();
    const row = (top: number, active: boolean) => (
        <View style={[styles.row, { top, backgroundColor: active ? colors.active : colors.row }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]} />
            <View style={[styles.rowLine, { backgroundColor: withAlpha(colors.ink, 0.55) }]} />
            <View style={[styles.rowSubline, { backgroundColor: withAlpha(colors.muted, 0.45) }]} />
            <View style={[styles.rowChip, { backgroundColor: withAlpha(colors.accent, 0.32) }]} />
        </View>
    );

    return (
        <Animated.View style={[styles.phone, rise(80, 40, 0.92)]}>
            <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={t("onboarding.customize.preview", { palette: name, mode })}
                style={[styles.screen, { backgroundColor: colors.canvas }]}
            >
                <View style={[styles.grabber, { backgroundColor: colors.track }]} />
                <Text style={[styles.kicker, { color: colors.muted }]}>{t("settings.previewToday")}</Text>
                <View style={styles.amount}>
                    <Text style={[styles.currency, { color: colors.muted }]}>$</Text>
                    <Text style={[styles.amountValue, { color: colors.ink }]}>{formatMoney(124.8)}</Text>
                </View>
                <View style={[styles.progress, { backgroundColor: colors.track }]}>
                    <View style={[styles.progressFill, { backgroundColor: colors.accent }]} />
                </View>
                {row(134, false)}
                {row(184, true)}
                <View style={[styles.tab, { backgroundColor: colors.accent }]} />
            </View>
        </Animated.View>
    );
}

function Swatch({ palette, color, selected, onPress }: { palette: PaletteId; color: string; selected: boolean; onPress: () => void }) {
    const { t } = useI18n();
    const index = PALETTES.findIndex((item) => item.id === palette);
    return (
        <Pressable
            testID={`onboarding-palette-${palette}`}
            accessibilityRole="radio"
            accessibilityLabel={t(`palette.${palette}`)}
            accessibilityState={{ checked: selected }}
            hitSlop={5}
            onPress={onPress}
            style={[styles.swatch, { left: SWATCH_X[index] - BAR.x - 18 }]}
        >
            <View style={[styles.swatchEdge, { backgroundColor: mixColors(color, "#000000", 0.32) }]} />
            <View style={[styles.swatchFace, { backgroundColor: color }]} />
            <Animated.View
                pointerEvents="none"
                style={[styles.swatchRing, { borderColor: color }, SWAP, {
                    opacity: selected ? 1 : 0,
                    transform: [{ scale: selected ? 1 : 0.7 }],
                }]}
            />
            <Animated.View pointerEvents="none" style={[styles.swatchCheck, SWAP, { opacity: selected ? 1 : 0, transform: [{ scale: selected ? 1 : 0.3 }] }]}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6 9 17l-5-5" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Animated.View>
        </Pressable>
    );
}

function ModeButton({ onPress }: { onPress: () => void }) {
    const { colors, look } = useOnboardingTheme();
    const { t } = useI18n();
    return (
        <Pressable
            testID="onboarding-mode"
            accessibilityRole="button"
            accessibilityLabel={t(look.dark ? "onboarding.customize.toLight" : "onboarding.customize.toDark")}
            hitSlop={5}
            onPress={onPress}
            style={styles.mode}
        >
            <View style={[styles.modeEdge, { backgroundColor: colors.edgeFill }]} />
            <View style={[styles.modeFace, { backgroundColor: colors.fill }]} />
            <Animated.View pointerEvents="none" style={[styles.modeIcon, ICON_SWAP, {
                opacity: look.dark ? 0 : 1,
                transform: [{ rotate: look.dark ? "90deg" : "0deg" }, { scale: look.dark ? 0.4 : 1 }],
            }]}
            >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={4} stroke={colors.ink} strokeWidth={2.2} />
                    <Path
                        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                        stroke={colors.ink}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                    />
                </Svg>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.modeIcon, ICON_SWAP, {
                opacity: look.dark ? 1 : 0,
                transform: [{ rotate: look.dark ? "0deg" : "-90deg" }, { scale: look.dark ? 1 : 0.4 }],
            }]}
            >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
            </Animated.View>
        </Pressable>
    );
}

/** The demo's finger: glides between the controls and presses them. */
function TapDot({ at, shown, jump, presses }: { at: ArtboardPoint; shown: boolean; jump: boolean; presses: number }) {
    const { colors } = useOnboardingTheme();
    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.dot, {
                opacity: shown ? 1 : 0,
                transform: [{ translateX: at.x }, { translateY: at.y }],
                transitionProperty: jump ? ["opacity"] : ["transform", "opacity"],
                transitionDuration: jump ? [260] : [380, 260],
                transitionTimingFunction: jump ? ["ease"] : [cubicBezier(0.45, 0, 0.25, 1), "ease"],
            }]}
        >
            {/* Keyed by the press count, so every press replays from the start. */}
            <Animated.View
                key={`ripple-${presses}`}
                style={[styles.dotRipple, { borderColor: withAlpha(colors.ink, 0.3) }, presses > 0 && {
                    animationName: RIPPLE,
                    animationDuration: 560,
                    animationTimingFunction: "ease-out",
                    animationFillMode: "both",
                }]}
            />
            <Animated.View
                key={`finger-${presses}`}
                style={[styles.dotFinger, { backgroundColor: withAlpha(colors.ink, 0.16) }, presses > 0 && {
                    animationName: TAP,
                    animationDuration: 420,
                    animationTimingFunction: "ease-out",
                    animationFillMode: "both",
                }]}
            />
        </Animated.View>
    );
}

const swatchAt = (palette: PaletteId): ArtboardPoint => ({
    x: SWATCH_X[PALETTES.findIndex((item) => item.id === palette)],
    y: BAR.y,
});

/**
 * Step four: pick the app's color and light or dark mode. Until someone does, a finger taps
 * through a few looks, each revealed over the whole onboarding the way the app switches themes.
 */
export function CustomizeStep({
    index,
    playing,
    reduced,
    board,
    onPreview,
    onPick,
}: {
    index: number;
    /** The current page and not leaving: the demo may run. */
    playing: boolean;
    reduced: boolean;
    /** The app's own look, which the demo starts from. */
    board: Look;
    onPreview: (look: Look, at: ArtboardPoint) => void;
    /** Someone chose a look: it becomes the app's. */
    onPick: (look: Look, at: ArtboardPoint) => void;
}) {
    const { colors, look } = useOnboardingTheme();
    const { t } = useI18n();
    const [dot, setDot] = useState({ at: swatchAt(board.palette), shown: false, jump: true });
    const [presses, setPresses] = useState(0);
    const [picked, setPicked] = useState(false);
    const demo = playing && !reduced && !picked;

    const tapAt = useEffectEvent((step: (typeof PLAN)[number]) => {
        if (step === "mode") return { look: { ...look, dark: !look.dark }, at: MODE_AT };
        const start = Math.max(0, PALETTES.findIndex((item) => item.id === board.palette));
        const palette = PALETTES[(start + step) % PALETTES.length].id;
        return { look: { ...look, palette }, at: swatchAt(palette) };
    });
    const preview = useEffectEvent(onPreview);

    useEffect(() => {
        if (!demo) return;
        const timers: ReturnType<typeof setTimeout>[] = [];
        let tap = 0;
        const next = () => {
            const target = tapAt(PLAN[tap % PLAN.length]);
            // The first tap appears in place; later ones glide between the controls.
            setDot({ at: target.at, shown: true, jump: tap === 0 });
            tap += 1;
            timers.push(setTimeout(() => {
                setPresses((count) => count + 1);
                preview(target.look, target.at);
                timers.push(setTimeout(next, TAP_GAP - PRESS_AFTER));
            }, PRESS_AFTER));
        };
        timers.push(setTimeout(next, FIRST_TAP));
        return () => timers.forEach(clearTimeout);
    }, [demo]);

    const pick = (next: Look, at: ArtboardPoint) => {
        setPicked(true);
        onPick(next, at);
    };

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art}>
                <PhonePreview />
                <Animated.View style={[styles.bar, rise(220, 26)]}>
                    <View style={[styles.barEdge, { backgroundColor: colors.edgeRaised }]} />
                    <View style={[styles.barFace, { backgroundColor: colors.raised }]} />
                    <View accessibilityRole="radiogroup" style={StyleSheet.absoluteFill}>
                        {PALETTES.map((palette) => (
                            <Swatch
                                key={palette.id}
                                palette={palette.id}
                                color={palette.accent}
                                selected={look.palette === palette.id}
                                onPress={() => {
                                    appHaptics.selection();
                                    // A color keeps the mode on show, even one the demo switched to.
                                    if (look.palette !== palette.id) pick({ ...look, palette: palette.id }, swatchAt(palette.id));
                                    else setPicked(true);
                                }}
                            />
                        ))}
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.track }]} />
                    <ModeButton
                        onPress={() => {
                            appHaptics.themeMode();
                            pick({ ...look, dark: !look.dark }, MODE_AT);
                        }}
                    />
                </Animated.View>
                <TapDot at={dot.at} shown={demo && dot.shown} jump={dot.jump} presses={presses} />
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
    phone: {
        position: "absolute",
        left: 108,
        top: 92,
        width: 196,
        height: 304,
        borderRadius: 38,
        padding: 6,
        backgroundColor: "#0F1112",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.09)",
        boxShadow: "0 30px 50px -24px rgba(0,0,0,0.42)",
    },
    screen: {
        flex: 1,
        borderRadius: 32,
        overflow: "hidden",
    },
    grabber: {
        position: "absolute",
        top: 12,
        left: "50%",
        width: 40,
        height: 5,
        marginLeft: -20,
        borderRadius: 3,
    },
    kicker: {
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: "Archivo-SemiBold",
        fontSize: 9.5,
        letterSpacing: 1.2,
    },
    amount: {
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
    },
    currency: {
        marginTop: 6,
        marginRight: 2,
        fontFamily: "Archivo-Medium",
        fontSize: 15,
    },
    amountValue: {
        fontFamily: "Archivo-Bold",
        fontSize: 34,
        letterSpacing: -1,
        fontVariant: ["tabular-nums"],
    },
    progress: {
        position: "absolute",
        top: 110,
        left: 32,
        right: 32,
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        width: "64%",
        height: "100%",
        borderRadius: 3,
    },
    row: {
        position: "absolute",
        left: 14,
        right: 14,
        height: 42,
        borderRadius: 13,
    },
    rowIcon: {
        position: "absolute",
        left: 10,
        top: 11,
        width: 20,
        height: 20,
        borderRadius: 7,
    },
    rowLine: {
        position: "absolute",
        left: 40,
        top: 13,
        width: 58,
        height: 6,
        borderRadius: 3,
    },
    rowSubline: {
        position: "absolute",
        left: 40,
        top: 24,
        width: 36,
        height: 5,
        borderRadius: 3,
    },
    rowChip: {
        position: "absolute",
        right: 11,
        top: 15,
        width: 30,
        height: 12,
        borderRadius: 6,
    },
    tab: {
        position: "absolute",
        bottom: 12,
        left: "50%",
        width: 44,
        height: 6,
        marginLeft: -22,
        borderRadius: 3,
    },
    bar: {
        position: "absolute",
        left: BAR.x,
        top: 424,
        width: 320,
        height: 60,
    },
    // The raised edge: a 1 pt outline that thickens to 5 pt along the bottom.
    barEdge: {
        position: "absolute",
        left: -1,
        right: -1,
        top: -1,
        bottom: -5,
        borderRadius: 31,
    },
    barFace: {
        ...StyleSheet.absoluteFill,
        borderRadius: 30,
    },
    swatch: {
        position: "absolute",
        top: 12,
        width: 36,
        height: 36,
    },
    swatchEdge: {
        position: "absolute",
        left: 0,
        top: 3,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    swatchFace: {
        ...StyleSheet.absoluteFill,
        borderRadius: 18,
    },
    swatchRing: {
        position: "absolute",
        left: -6,
        top: -6,
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
    },
    swatchCheck: {
        ...StyleSheet.absoluteFill,
        alignItems: "center",
        justifyContent: "center",
    },
    divider: {
        position: "absolute",
        left: 250,
        top: 16,
        width: 1.5,
        height: 28,
        borderRadius: 1,
    },
    mode: {
        position: "absolute",
        left: 268,
        top: 12,
        width: 36,
        height: 36,
    },
    modeEdge: {
        position: "absolute",
        left: -1,
        right: -1,
        top: -1,
        bottom: -3,
        borderRadius: 19,
    },
    modeFace: {
        ...StyleSheet.absoluteFill,
        borderRadius: 18,
    },
    modeIcon: {
        position: "absolute",
        left: 9,
        top: 9,
        width: 18,
        height: 18,
    },
    dot: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 5,
    },
    dotFinger: {
        position: "absolute",
        left: -16,
        top: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.75)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
    },
    dotRipple: {
        position: "absolute",
        left: -16,
        top: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        opacity: 0,
    },
});
