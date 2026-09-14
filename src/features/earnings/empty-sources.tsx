import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    ReduceMotion,
    useAnimatedProps,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Svg, { G, Mask, Path } from "react-native-svg";

import { useI18n } from "@/features/i18n/i18n";

import { useEarningsTheme } from "./theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ARROW_CURVE_LENGTH = 180;
const ARROW_HEAD_LENGTH = 64;
const ARROW_CURVE_DELAY = 180;
const ARROW_CURVE_DURATION = 720;
const ARROW_HEAD_DELAY = ARROW_CURVE_DELAY + ARROW_CURVE_DURATION * 0.25;
const ARROW_HEAD_DURATION = 720;
const TEXT_ENTER_DELAY = ARROW_CURVE_DELAY + ARROW_CURVE_DURATION * 0.25;
const TEXT_ENTER_DURATION = 320 * 1.1;

export function EmptySourcesMessage() {
    const { t } = useI18n();
    return (
        <View testID="empty-sources" className="items-center py-4">
            <Text className="text-center font-sans text-[17px] font-semibold text-ink">{t("home.noSources")}</Text>
        </View>
    );
}

function FirstSourceArrow({ color, onPress }: { color: string; onPress: () => void }) {
    const curveOffset = useSharedValue(ARROW_CURVE_LENGTH);
    const headProgress = useSharedValue(0);
    const curveAnimatedProps = useAnimatedProps(() => ({ strokeDashoffset: curveOffset.value }));
    const headAnimatedProps = useAnimatedProps(() => ({
        strokeDashoffset: ARROW_HEAD_LENGTH * (1 - headProgress.value),
    }));

    useEffect(() => {
        curveOffset.set(withDelay(ARROW_CURVE_DELAY, withTiming(0, {
            duration: ARROW_CURVE_DURATION,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
        })));
        headProgress.set(withDelay(ARROW_HEAD_DELAY, withTiming(1, {
            duration: ARROW_HEAD_DURATION,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
        })));
    }, [curveOffset, headProgress]);

    return (
        <Svg width={156} height={90} viewBox="0 0 156 90" fill="none" accessible={false}>
            <Mask id="first-source-arrow-reveal" x={0} y={0} width={156} height={90} maskUnits="userSpaceOnUse">
                <AnimatedPath
                    animatedProps={curveAnimatedProps}
                    d="M8 8 C48 3 118 12 129 48 C132 58 132 68 130 81"
                    stroke="white"
                    strokeWidth={7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={ARROW_CURVE_LENGTH}
                />
                <AnimatedPath
                    animatedProps={headAnimatedProps}
                    d="M118 68 Q124 76 130 82 Q138 76 144 69"
                    stroke="white"
                    strokeWidth={7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={[ARROW_HEAD_LENGTH, ARROW_HEAD_LENGTH]}
                />
            </Mask>
            <G mask="url(#first-source-arrow-reveal)">
                <Path
                    d="M8 8 C48 3 118 12 129 48 C132 58 132 68 130 81"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={[6, 7]}
                />
                <Path
                    d="M118 68 Q124 76 130 82 Q138 76 144 69"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <Path
                    d="M8 8 C48 3 118 12 129 48 C132 58 132 68 130 81 M118 68 Q124 76 130 82 Q138 76 144 69"
                    stroke="transparent"
                    strokeWidth={18}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onPress={onPress}
                />
            </G>
        </Svg>
    );
}

export function EmptySourcesCallout({ bottomInset }: { bottomInset: number }) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const [animationKey, setAnimationKey] = useState(0);
    const bottom = Platform.OS === "android"
        ? Math.max(bottomInset, 20) + 80
        : Math.max(bottomInset + 4, 12);

    return (
        <Animated.View
            pointerEvents="box-none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="first-source-callout"
            className="absolute right-[26px] items-end"
            style={{ bottom }}
            exiting={FadeOut.duration(180).reduceMotion(ReduceMotion.System)}
        >
            <Animated.Text
                key={`first-source-text-${animationKey}`}
                className="mr-10 max-w-[250px] font-sans text-[15px] font-medium text-accent-deep"
                style={{ transform: [{ rotate: "-4deg" }] }}
                entering={FadeIn
                    .delay(TEXT_ENTER_DELAY)
                    .duration(TEXT_ENTER_DURATION)
                    .reduceMotion(ReduceMotion.System)}
                onPress={() => setAnimationKey((current) => current + 1)}
            >
                {t("home.addSource")}
            </Animated.Text>
            <FirstSourceArrow
                key={`first-source-arrow-${animationKey}`}
                color={colors.accentDeep}
                onPress={() => setAnimationKey((current) => current + 1)}
            />
        </Animated.View>
    );
}
