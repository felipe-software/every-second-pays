import { type ReactNode, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { Raised } from "@/components/elevated/raised";
import { RiseIn } from "@/components/elevated/rise-in";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { CheckGlyph, LockBody, LockShackle } from "./icons";
import { StepCopy } from "./step-copy";

const TILE = 136;
const LOCK = 72;
const CLOSE_DELAY = 520;
const RING_DURATION = 2400;

function Ring({ delay, color }: { delay: number; color: string }) {
    const t = useSharedValue(0);
    const style = useAnimatedStyle(() => ({
        opacity: 0.4 * (1 - t.get()),
        transform: [{ scale: 1 + t.get() * 0.9 }],
    }));

    useEffect(() => {
        t.set(withDelay(delay, withRepeat(
            withTiming(1, { duration: RING_DURATION, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
            -1,
            false,
            undefined,
            ReduceMotion.System,
        ), ReduceMotion.System));
        return () => cancelAnimation(t);
    }, [delay, t]);

    return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color }, style]} />;
}

/** A padlock in a raised tile whose shackle snaps shut, then sends out calm rings. */
function ClosingLock() {
    const { colors } = useEarningsTheme();
    const shackle = useSharedValue(-11);
    const shackleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: shackle.get() }] }));

    useEffect(() => {
        const click = () => appHaptics.themeMode();
        shackle.set(withDelay(
            CLOSE_DELAY,
            withSpring(0, { damping: 9, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System }, (finished) => {
                if (finished) scheduleOnRN(click);
            }),
            ReduceMotion.System,
        ));
        return () => cancelAnimation(shackle);
    }, [shackle]);

    return (
        <View style={styles.lockStage}>
            <Ring delay={CLOSE_DELAY + 120} color={colors.accent} />
            <Ring delay={CLOSE_DELAY + 120 + RING_DURATION / 2} color={colors.accent} />
            <Raised surface="raised" depth={4} radius={42} className="items-center justify-center" style={{ width: TILE, height: TILE }}>
                <View style={{ width: LOCK, height: LOCK }}>
                    <Animated.View style={[StyleSheet.absoluteFill, shackleStyle]}>
                        <LockShackle color={colors.accentDeep} size={LOCK} />
                    </Animated.View>
                    <View style={StyleSheet.absoluteFill}>
                        <LockBody color={colors.accentDeep} size={LOCK} />
                    </View>
                </View>
            </Raised>
        </View>
    );
}

function PrivacyPoint({ children, delay }: { children: ReactNode; delay: number }) {
    const { colors } = useEarningsTheme();
    return (
        <RiseIn delay={delay}>
            <Raised surface="fill" depth={2} radius={14} className="flex-row items-center gap-[10px] py-[10px] pr-4 pl-3">
                <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}>
                    <CheckGlyph color={colors.ink} size={13} />
                </View>
                <Text className="font-sans text-[15px] font-semibold text-ink">{children}</Text>
            </Raised>
        </RiseIn>
    );
}

/** Step three: nothing leaves the phone. */
export function PrivateStep({ visit, width, height }: { visit: number; width: number; height: number }) {
    const { t } = useI18n();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ width, height, paddingTop: insets.top + height * 0.13 }} className="items-center">
            <View key={visit} className="items-center">
                <RiseIn distance={24}>
                    <ClosingLock />
                </RiseIn>
                <View className="mt-12">
                    <StepCopy delay={140} title={t("onboarding.private.title")} body={t("onboarding.private.body")} />
                </View>
                <View className="mt-7 items-center gap-1">
                    <PrivacyPoint delay={420}>{t("onboarding.private.noAccount")}</PrivacyPoint>
                    <PrivacyPoint delay={500}>{t("onboarding.private.noTracking")}</PrivacyPoint>
                    <PrivacyPoint delay={580}>{t("onboarding.private.onDevice")}</PrivacyPoint>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    lockStage: {
        width: TILE + 40,
        height: TILE + 40,
        alignItems: "center",
        justifyContent: "center",
    },
    ring: {
        position: "absolute",
        width: TILE,
        height: TILE,
        borderRadius: 48,
        borderWidth: 2,
    },
});
