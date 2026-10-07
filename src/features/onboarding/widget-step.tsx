import { Image } from "expo-image";
import { NumberFlow } from "number-flow-react-native";
import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { RiseIn } from "@/components/elevated/rise-in";
import { mixColors } from "@/features/appearance/color";
import { LiveDot } from "@/features/earnings/live-dot";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";

import { StepCopy } from "./step-copy";

const START_TOTAL = 127.62;
const TICK_INTERVAL = 420;
const BEZEL = 7;
const BILL = require("@/assets/images/android-icon-foreground.png");

/** A bill drifting up behind the widget's counter, over and over, like the native widget's ambient bills. */
const DriftingBill = memo(function DriftingBill({
    x,
    size,
    delay,
    duration,
    height,
}: {
    x: number;
    size: number;
    delay: number;
    duration: number;
    height: number;
}) {
    const t = useSharedValue(0);
    const style = useAnimatedStyle(() => ({
        opacity: interpolate(t.get(), [0, 0.15, 0.85, 1], [0, 0.55, 0.55, 0], Extrapolation.CLAMP),
        transform: [
            { translateX: x + Math.sin(t.get() * Math.PI * 2) * 10 },
            { translateY: height + size - t.get() * (height + size * 2) },
            { rotateZ: `${-18 + t.get() * 36}deg` },
        ],
    }));

    useEffect(() => {
        t.set(withDelay(delay, withRepeat(
            withTiming(1, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
            -1,
            false,
            undefined,
            ReduceMotion.System,
        ), ReduceMotion.System));
        return () => cancelAnimation(t);
    }, [delay, duration, t]);

    return (
        <Animated.View style={[styles.drift, { width: size, height: size, marginLeft: size / -2, marginTop: size / -2 }, style]}>
            <Image source={BILL} contentFit="contain" cachePolicy="memory" style={StyleSheet.absoluteFill} />
        </Animated.View>
    );
});

/** The live money widget, redrawn in JS: period and live dot, a ticking total, the hourly rate. */
function SampleWidget({ width, height }: { width: number; height: number }) {
    const { colors } = useEarningsTheme();
    const { t, locale, decimalSeparator } = useI18n();
    const [total, setTotal] = useState(START_TOTAL);
    const bump = useSharedValue(1);
    const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
    const whole = Math.floor(total);
    const cents = Math.round((total - whole) * 100) % 100;
    const big = Math.round(height * 0.36);
    const small = Math.round(big * 0.42);

    useEffect(() => {
        const timer = setInterval(() => {
            setTotal((value) => Math.round((value + 0.03 + Math.random() * 0.06) * 100) / 100);
        }, TICK_INTERVAL);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (whole === Math.floor(START_TOTAL)) return;
        bump.set(withSequence(
            ReduceMotion.System,
            withTiming(1.1, { duration: 110, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
            withSpring(1, { damping: 10, stiffness: 220, mass: 0.55, reduceMotion: ReduceMotion.System }),
        ));
    }, [bump, whole]);

    return (
        <View
            accessible
            accessibilityLabel={t("widgets.previewAccessibility")}
            style={{ width, height, borderRadius: 24, overflow: "hidden", backgroundColor: colors.canvas }}
        >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <DriftingBill x={width * 0.14} size={34} delay={0} duration={5200} height={height} />
                <DriftingBill x={width * 0.86} size={30} delay={1300} duration={4600} height={height} />
                <DriftingBill x={width * 0.32} size={26} delay={2600} duration={5800} height={height} />
                <DriftingBill x={width * 0.7} size={36} delay={3600} duration={5000} height={height} />
            </View>
            <View className="flex-1 items-center justify-center px-4">
                <View className="flex-row items-center gap-[6px]">
                    <LiveDot live size={6} />
                    <Text style={{ color: colors.accentDeep, fontFamily: "Archivo-SemiBold", fontSize: 11, letterSpacing: 1.2 }}>
                        {t("period.today").toLocaleUpperCase(locale)}
                    </Text>
                </View>
                <Animated.View style={[styles.widgetCounter, bumpStyle]}>
                    <Text style={{ color: colors.muted, fontFamily: "Archivo-Medium", fontSize: small, marginRight: 2 }}>$</Text>
                    <NumberFlow
                        value={whole}
                        locales={locale}
                        format={{ maximumFractionDigits: 0 }}
                        trend={1}
                        mask
                        style={{ color: colors.ink, fontFamily: "Archivo-Bold", fontSize: big, fontWeight: "700", letterSpacing: -big * 0.05 }}
                    />
                    <Text style={{ color: colors.muted, fontFamily: "Archivo-SemiBold", fontSize: small }}>{decimalSeparator}</Text>
                    <NumberFlow
                        value={cents}
                        locales={locale}
                        format={{ minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false }}
                        trend={1}
                        mask
                        style={{ color: colors.muted, fontFamily: "Archivo-SemiBold", fontSize: small, fontWeight: "600" }}
                    />
                </Animated.View>
                <Text style={{ color: colors.muted, fontFamily: "Archivo-Medium", fontSize: 11.5 }}>
                    {t("widgets.rateCaption", { amount: `$${(25).toLocaleString(locale, { minimumFractionDigits: 2 })}` })}
                </Text>
            </View>
        </View>
    );
}

function AppIcon({ size, color }: { size: number; color: string }) {
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** A generic Android launcher: wallpaper, status bar, the widget, a grid of apps, a dock. */
function HomeScreen({ width, height, visit }: { width: number; height: number; visit: number }) {
    const { colors, isDark } = useEarningsTheme();
    const pop = useSharedValue(0);
    const popStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pop.get(), [0, 0.4], [0, 1], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(pop.get(), [0, 1], [0.82, 1]) }, { translateY: (1 - pop.get()) * 14 }],
    }));
    const inner = width - BEZEL * 2;
    const innerHeight = height - BEZEL * 2;
    const icon = Math.round(inner * 0.15);
    const iconColors = [0.18, 0.3, 0.42, 0.24].map((amount) => mixColors(colors.accentDeep, "#FFFFFF", amount));
    const top = mixColors(colors.accent, isDark ? "#000000" : "#FFFFFF", isDark ? 0.35 : 0.12);
    const bottom = mixColors(colors.accentDeep, "#000000", isDark ? 0.55 : 0.28);

    useEffect(() => {
        if (visit === 0) return;
        pop.set(0);
        pop.set(withDelay(260, withSpring(1, { damping: 12, stiffness: 160, mass: 0.8, reduceMotion: ReduceMotion.System }), ReduceMotion.System));
    }, [pop, visit]);

    return (
        <View style={{ width, height, borderRadius: 40, padding: BEZEL, backgroundColor: "#121314" }}>
            <View style={{ flex: 1, borderRadius: 33, overflow: "hidden" }}>
                <Svg width={inner} height={innerHeight} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="wallpaper" x1="0" y1="0" x2="0.6" y2="1">
                            <Stop offset="0" stopColor={top} />
                            <Stop offset="1" stopColor={bottom} />
                        </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width={inner} height={innerHeight} fill="url(#wallpaper)" />
                </Svg>

                <View className="flex-row items-center justify-between px-5 pt-3">
                    <Text style={{ color: "#FFFFFF", fontFamily: "Archivo-SemiBold", fontSize: 12 }}>9:41</Text>
                    <View className="flex-row items-center gap-[5px]">
                        <View style={{ width: 12, height: 9, borderRadius: 2, backgroundColor: "#FFFFFFCC" }} />
                        <View style={{ width: 18, height: 9, borderRadius: 3, borderWidth: 1.2, borderColor: "#FFFFFFCC" }} />
                    </View>
                </View>

                <Animated.View className="mt-4 items-center" style={popStyle}>
                    <SampleWidget width={inner - 24} height={Math.round((inner - 24) * 0.48)} />
                </Animated.View>

                <View className="mt-5 flex-row flex-wrap justify-between px-[18px]" style={{ rowGap: 16 }}>
                    {Array.from({ length: 8 }, (_, index) => (
                        <View key={index} className="items-center gap-[6px]" style={{ width: icon + 8 }}>
                            <AppIcon size={icon} color={iconColors[index % iconColors.length]} />
                            <View style={{ width: icon * 0.7, height: 4, borderRadius: 2, backgroundColor: "#FFFFFF66" }} />
                        </View>
                    ))}
                </View>

                <View className="absolute bottom-0 left-0 right-0 px-[18px] pb-3">
                    <View className="mb-3 flex-row justify-between">
                        {iconColors.map((color, index) => (
                            <AppIcon key={index} size={icon} color={color} />
                        ))}
                    </View>
                    <View style={{ height: 34, borderRadius: 17, backgroundColor: "#FFFFFF2E" }} />
                    <View className="mt-3 self-center" style={{ width: 72, height: 4, borderRadius: 2, backgroundColor: "#FFFFFFAA" }} />
                </View>
            </View>
        </View>
    );
}

/** Step two: the money keeps counting on the home screen. */
export function WidgetStep({ visit, width, height }: { visit: number; width: number; height: number }) {
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const phoneWidth = Math.min(width - 96, 292);
    const phoneHeight = Math.min(height * 0.5, phoneWidth * 1.72);

    return (
        <View style={{ width, height, paddingTop: insets.top + height * 0.07 }} className="items-center">
            <View key={visit} className="items-center">
                <RiseIn distance={40}>
                    <HomeScreen width={phoneWidth} height={phoneHeight} visit={visit} />
                </RiseIn>
                <View className="mt-8">
                    <StepCopy delay={160} title={t("onboarding.widget.title")} body={t("onboarding.widget.body")} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    drift: {
        position: "absolute",
        left: 0,
        top: 0,
    },
    widgetCounter: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 2,
    },
});
