import NativeMaskedView from "@react-native-masked-view/masked-view";
import type { PropsWithChildren } from "react";
import { Platform, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

export interface PillMaskedViewProps extends PropsWithChildren {
    animatedStyle: StyleProp<AnimatedStyle<ViewStyle>>;
    clipStyle: StyleProp<AnimatedStyle<ViewStyle>>;
    contentHeight: number;
    contentStyle: StyleProp<AnimatedStyle<ViewStyle>>;
    contentWidth: number;
    height: number;
    left: number;
    tabWidth: number;
    top: number;
}

const PillMaskElement = ({
    animatedStyle,
    height,
    left,
    top,
}: Pick<PillMaskedViewProps, "animatedStyle" | "height" | "left" | "top">) => (
    <Animated.View style={[styles.mask, { height, left, top }, animatedStyle]} />
);

export const PillMaskedView = ({
    animatedStyle,
    children,
    clipStyle,
    contentHeight,
    contentStyle,
    contentWidth,
    height,
    left,
    tabWidth,
    top,
}: PillMaskedViewProps) => {
    if (Platform.OS === "web") {
        // Round with border-radius: Safari drops the rounding of an animated clip-path on stray frames.
        return (
            <Animated.View
                style={[
                    styles.webClipBox,
                    WEB_CLIP_LAYER,
                    {
                        borderRadius: height / 2,
                        height,
                        left,
                        top,
                        width: tabWidth,
                    },
                    clipStyle,
                ]}
            >
                <Animated.View
                    style={[styles.webContent, { height: contentHeight, width: contentWidth }, contentStyle]}
                >
                    {children}
                </Animated.View>
            </Animated.View>
        );
    }

    return (
        <NativeMaskedView
            androidRenderingMode="hardware"
            style={StyleSheet.absoluteFill}
            maskElement={<PillMaskElement animatedStyle={animatedStyle} height={height} left={left} top={top} />}
        >
            {children}
        </NativeMaskedView>
    );
};

// Static clip-path: in Chromium a backdrop-filter child can escape border-radius as a square halo.
const WEB_CLIP_LAYER = {
    clipPath: "inset(0 round 999px)",
    overflow: "hidden",
    willChange: "transform",
} as const;

const styles = StyleSheet.create({
    webClipBox: {
        position: "absolute",
        overflow: "hidden",
    },
    webContent: {
        position: "absolute",
        left: 0,
        top: 0,
    },
    mask: {
        position: "absolute",
        backgroundColor: "#000000",
        borderRadius: 999,
    },
});
