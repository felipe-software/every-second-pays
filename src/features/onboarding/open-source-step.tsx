import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { useEffect } from "react";
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
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { Raised, RaisedPressable } from "@/components/elevated/raised";
import { RiseIn } from "@/components/elevated/rise-in";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { CodeGlyph, ExternalGlyph, GitHubMark } from "./icons";
import { StepCopy } from "./step-copy";

export const SOURCE_URL = "https://github.com/felipe-software/every-second-pays";
const SOURCE_LABEL = "felipe-software/every-second-pays";
const CODE_LINES = [
    { indent: 0, width: 0.62 },
    { indent: 1, width: 0.78 },
    { indent: 2, width: 0.46 },
    { indent: 1, width: 0.3 },
    { indent: 0, width: 0.54 },
];
const CARD_WIDTH = 216;
const LINE_SPACE = CARD_WIDTH - 72;

/** One line of code typing itself out, left to right. */
function CodeLine({ index, indent, width, color }: { index: number; indent: number; width: number; color: string }) {
    const t = useSharedValue(0);
    const full = LINE_SPACE * width;
    const style = useAnimatedStyle(() => ({ width: full * t.get() }));

    useEffect(() => {
        t.set(withDelay(
            380 + index * 170,
            withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
            ReduceMotion.System,
        ));
        return () => cancelAnimation(t);
    }, [index, t]);

    return (
        <View style={{ height: 6, marginLeft: indent * 14 }}>
            <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, style]} />
        </View>
    );
}

/** The GitHub mark floating over a small editor whose lines type themselves in. */
function SourceHero() {
    const { colors } = useEarningsTheme();
    const float = useSharedValue(0);
    const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));

    useEffect(() => {
        float.set(withRepeat(
            withSequence(
                withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
            ),
            -1,
            false,
            undefined,
            ReduceMotion.System,
        ));
        return () => cancelAnimation(float);
    }, [float]);

    return (
        <View className="items-center">
            <Animated.View style={[styles.mark, floatStyle]}>
                <Raised surface="raised" depth={4} radius={34} className="items-center justify-center" style={{ width: 104, height: 104 }}>
                    <GitHubMark color={colors.ink} size={56} />
                </Raised>
            </Animated.View>
            <Raised surface="fill" depth={3} radius={20} style={{ width: CARD_WIDTH, marginTop: -26, paddingTop: 40, paddingBottom: 18, paddingHorizontal: 18 }}>
                <View className="flex-row gap-3">
                    <CodeGlyph color={colors.accentDeep} size={18} />
                    <View className="flex-1 gap-[9px] pt-[6px]">
                        {CODE_LINES.map((line, index) => (
                            <CodeLine
                                key={index}
                                index={index}
                                indent={line.indent}
                                width={line.width}
                                color={index % 2 === 0 ? colors.accent : colors.track}
                            />
                        ))}
                    </View>
                </View>
            </Raised>
        </View>
    );
}

/** Step four: the code is public, with a link to it. */
export function OpenSourceStep({ visit, width, height }: { visit: number; width: number; height: number }) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const insets = useSafeAreaInsets();

    const openSource = () => {
        appHaptics.secondaryAction();
        void openBrowserAsync(SOURCE_URL, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
    };

    return (
        <View style={{ width, height, paddingTop: insets.top + height * 0.1 }} className="items-center">
            <View key={visit} className="items-center">
                <RiseIn distance={24}>
                    <SourceHero />
                </RiseIn>
                <View className="mt-10">
                    <StepCopy delay={140} title={t("onboarding.openSource.title")} body={t("onboarding.openSource.body")} />
                </View>
                <View className="mt-6">
                    <RiseIn delay={320}>
                        <RaisedPressable
                            testID="onboarding-source-link"
                            accessibilityRole="link"
                            accessibilityLabel={t("onboarding.openSource.linkAccessibility")}
                            onPress={openSource}
                            surface="raised"
                            depth={3}
                            radius={16}
                            className="h-12 flex-row items-center gap-[10px] px-4"
                        >
                            <GitHubMark color={colors.ink} size={18} />
                            <Text className="font-sans text-[14.5px] font-semibold text-ink">{SOURCE_LABEL}</Text>
                            <ExternalGlyph color={colors.muted} size={15} />
                        </RaisedPressable>
                    </RiseIn>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mark: {
        zIndex: 1,
    },
});
