import { type ScrollHeaderProps, ScrollViewWithHeaders } from "@codeherence/react-native-header";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { type ComponentProps, type ReactNode } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEarningsTheme } from "@/features/earnings/theme";

/** Height of the compact bar under the status bar. Fits a 40pt raised back button. */
const BAR_HEIGHT = 52;
/** How far the backdrop keeps fading out below the bar. */
const FADE_HEIGHT = 32;

type LargeTitleScrollViewProps = Omit<
    ComponentProps<typeof ScrollViewWithHeaders>,
    "HeaderComponent" | "LargeHeaderComponent" | "absoluteHeader" | "initialAbsoluteHeaderHeight"
> & {
    title: string;
    /** Pinned to the left of the compact bar, e.g. a back button. */
    headerLeft?: ReactNode;
    /**
     * The page's fixed background, drawn behind the page and again in the compact bar, so content
     * fades into the same colors it scrolls over. Plain canvas when omitted.
     */
    background?: ReactNode;
};

/**
 * A page that scrolls under an iOS-style large title. Once content scrolls under the status bar,
 * a sticky bar fades in over it: the page background fading out below the bar (with a matching
 * progressive blur on iOS), and a compact title once the large one has scrolled away. Use it for
 * every titled page.
 */
export function LargeTitleScrollView({ title, headerLeft, background, children, ...rest }: LargeTitleScrollViewProps) {
    const insets = useSafeAreaInsets();

    return (
        <>
            {background}
            <ScrollViewWithHeaders
                {...rest}
                absoluteHeader
                initialAbsoluteHeaderHeight={insets.top + BAR_HEIGHT}
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
    const height = insets.top + BAR_HEIGHT + FADE_HEIGHT;
    // The backdrop shows as soon as content slides under the status bar, like iOS.
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.get(), [0, 20], [0, 1], Extrapolation.CLAMP),
    }));
    const titleStyle = useAnimatedStyle(() => ({
        opacity: showNavBar.get(),
        transform: [{ translateY: (1 - showNavBar.get()) * 8 }],
    }));

    return (
        <View style={{ paddingTop: insets.top }}>
            <Animated.View pointerEvents="none" style={[styles.backdrop, { height }, backdropStyle]}>
                <Backdrop background={background} solidUntil={(insets.top + BAR_HEIGHT * 0.7) / height} />
            </Animated.View>
            <View style={{ height: BAR_HEIGHT }} className="flex-row items-center justify-center px-[22px]">
                <Animated.View pointerEvents="none" style={[styles.title, titleStyle]}>
                    <Text
                        numberOfLines={1}
                        importantForAccessibility="no"
                        accessibilityElementsHidden
                        className="font-sans text-[17px] font-semibold tracking-[-0.3px] text-ink"
                    >
                        {title}
                    </Text>
                </Animated.View>
                {headerLeft ? <View className="absolute left-[22px]">{headerLeft}</View> : null}
            </View>
        </View>
    );
}

/** A vertical alpha mask: opaque down to `solidUntil` (0–1), then fading through `stops`. */
function FadeMask({ solidUntil, stops }: { solidUntil: number; stops: string }) {
    return (
        <View
            style={[
                StyleSheet.absoluteFill,
                { experimental_backgroundImage: `linear-gradient(180deg, #000 0%, #000 ${Math.round(solidUntil * 100)}%, ${stops})` },
            ]}
        />
    );
}

/**
 * The page background faded out below the bar. iOS also blurs the content under it, with the
 * blur outlasting the background a little so the fade reads as a progressive blur.
 */
function Backdrop({ background, solidUntil }: Pick<LargeTitleScrollViewProps, "background"> & { solidUntil: number }) {
    const { height } = useWindowDimensions();
    const { isDark } = useEarningsTheme();

    return (
        <>
            {Platform.OS === "ios" ? (
                <MaskedView
                    style={StyleSheet.absoluteFill}
                    maskElement={<FadeMask solidUntil={solidUntil} stops="rgba(0, 0, 0, 0.85) 75%, transparent 100%" />}
                >
                    <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                </MaskedView>
            ) : null}
            <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={<FadeMask solidUntil={solidUntil} stops={`rgba(0, 0, 0, ${Platform.OS === "ios" ? 0.35 : 0.6}) 70%, transparent 100%`} />}
            >
                {/* Screen-tall, so a background laid out from the top lines up with the real one. */}
                <View style={{ height }}>
                    {background ?? <View className="absolute inset-0 bg-canvas" />}
                </View>
            </MaskedView>
        </>
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
    title: {
        maxWidth: "60%",
    },
});
