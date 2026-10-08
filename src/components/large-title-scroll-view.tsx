import { type ScrollHeaderProps, ScrollViewWithHeaders } from "@codeherence/react-native-header";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { type ComponentProps, type ReactNode } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEarningsTheme } from "@/features/earnings/theme";

const IS_IOS = Platform.OS === "ios";
export const PAGE_GUTTER = 22;
const BAR_HEIGHT = 52;
const BACKDROP_FADE_HEIGHT = 32;
const BACKDROP_SOLID_BAR_FRACTION = 0.7;
const BACKDROP_FADE_IN_SCROLL = 20;
const COMPACT_TITLE_RISE = 8;
const BLUR_INTENSITY = 30;
// Android has no blur behind the bar, so its background stays denser to keep content legible.
const BLUR_MASK_STOPS = "rgba(0, 0, 0, 0.85) 75%, transparent 100%";
const BACKGROUND_MASK_STOPS = `rgba(0, 0, 0, ${IS_IOS ? 0.35 : 0.6}) 70%, transparent 100%`;

type LargeTitleScrollViewProps = Omit<
    ComponentProps<typeof ScrollViewWithHeaders>,
    "HeaderComponent" | "LargeHeaderComponent" | "absoluteHeader" | "initialAbsoluteHeaderHeight"
> & {
    title: string;
    headerLeft?: ReactNode;
    background?: ReactNode;
};

export function LargeTitleScrollView({
    title,
    headerLeft,
    background,
    contentContainerStyle,
    children,
    ...rest
}: LargeTitleScrollViewProps) {
    const insets = useSafeAreaInsets();

    return (
        <>
            {background}
            <ScrollViewWithHeaders
                {...rest}
                absoluteHeader
                initialAbsoluteHeaderHeight={insets.top + BAR_HEIGHT}
                contentContainerStyle={[{ paddingHorizontal: PAGE_GUTTER }, contentContainerStyle]}
                HeaderComponent={({ showNavBar, scrollY }) => (
                    <TitleBar title={title} headerLeft={headerLeft} background={background} showNavBar={showNavBar} scrollY={scrollY} />
                )}
                LargeHeaderComponent={() => (
                    <Text accessibilityRole="header" className="pb-1 font-sans text-[38px] font-bold tracking-[-1.4px] text-ink">
                        {title}
                    </Text>
                )}
            >
                {children}
            </ScrollViewWithHeaders>
        </>
    );
}

function TitleBar({
    title,
    headerLeft,
    background,
    showNavBar,
    scrollY,
}: ScrollHeaderProps & Pick<LargeTitleScrollViewProps, "title" | "headerLeft" | "background">) {
    const insets = useSafeAreaInsets();
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.get(), [0, BACKDROP_FADE_IN_SCROLL], [0, 1], Extrapolation.CLAMP),
    }));
    const compactTitleStyle = useAnimatedStyle(() => ({
        opacity: showNavBar.get(),
        transform: [{ translateY: (1 - showNavBar.get()) * COMPACT_TITLE_RISE }],
    }));

    return (
        <View style={{ paddingTop: insets.top }}>
            <Backdrop background={background} style={backdropStyle} />
            <View style={styles.bar}>
                <Animated.View pointerEvents="none" style={[styles.compactTitle, compactTitleStyle]}>
                    <Text
                        numberOfLines={1}
                        importantForAccessibility="no"
                        accessibilityElementsHidden
                        className="font-sans text-[17px] font-semibold tracking-[-0.3px] text-ink"
                    >
                        {title}
                    </Text>
                </Animated.View>
                {headerLeft ? <View style={styles.headerLeft}>{headerLeft}</View> : null}
            </View>
        </View>
    );
}

function Backdrop({
    background,
    style,
}: Pick<LargeTitleScrollViewProps, "background"> & { style: ComponentProps<typeof Animated.View>["style"] }) {
    const insets = useSafeAreaInsets();
    const { height: screenHeight } = useWindowDimensions();
    const { isDark } = useEarningsTheme();
    const height = insets.top + BAR_HEIGHT + BACKDROP_FADE_HEIGHT;
    const solidUntil = (insets.top + BAR_HEIGHT * BACKDROP_SOLID_BAR_FRACTION) / height;

    return (
        <Animated.View pointerEvents="none" style={[styles.backdrop, { height }, style]}>
            {IS_IOS ? (
                <MaskedView style={StyleSheet.absoluteFill} maskElement={<FadeMask solidUntil={solidUntil} stops={BLUR_MASK_STOPS} />}>
                    <BlurView intensity={BLUR_INTENSITY} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                </MaskedView>
            ) : null}
            <MaskedView style={StyleSheet.absoluteFill} maskElement={<FadeMask solidUntil={solidUntil} stops={BACKGROUND_MASK_STOPS} />}>
                {/* Screen-tall, so a background laid out from the top lines up with the page's own. */}
                <View style={{ height: screenHeight }}>
                    {background ?? <View className="absolute inset-0 bg-canvas" />}
                </View>
            </MaskedView>
        </Animated.View>
    );
}

function FadeMask({ solidUntil, stops }: { solidUntil: number; stops: string }) {
    const solidPercent = `${Math.round(solidUntil * 100)}%`;

    return (
        <View
            style={[
                StyleSheet.absoluteFill,
                { experimental_backgroundImage: `linear-gradient(180deg, #000 0%, #000 ${solidPercent}, ${stops})` },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        overflow: "hidden",
    },
    bar: {
        height: BAR_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: PAGE_GUTTER,
    },
    compactTitle: {
        maxWidth: "60%",
    },
    headerLeft: {
        position: "absolute",
        left: PAGE_GUTTER,
    },
});
