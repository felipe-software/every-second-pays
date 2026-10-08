import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useOnboardingTheme } from "./look";
import { rise, wordIn } from "./motion";

const WORD_STAGGER = 60;

/**
 * A page's title and line: the title tips in word by word, then the line rises under it.
 * `top` is where the copy starts on the design artboard.
 */
export function StepCopy({
    top,
    title,
    body,
    titleDelay,
    bodyDelay,
    children,
}: {
    top: number;
    title: string;
    body: string;
    titleDelay: number;
    bodyDelay: number;
    children?: ReactNode;
}) {
    const { colors } = useOnboardingTheme();
    const words = title.split(" ");

    return (
        <View pointerEvents="box-none" style={[styles.copy, { top }]}>
            {/* Separate views per word: transforms don't apply to text nested inside text. */}
            <View accessible accessibilityRole="header" accessibilityLabel={title} style={styles.titleRow}>
                {words.map((word, index) => (
                    <Animated.Text
                        key={`${word}-${index}`}
                        style={[styles.title, { color: colors.ink }, wordIn(titleDelay + index * WORD_STAGGER)]}
                    >
                        {index < words.length - 1 ? `${word} ` : word}
                    </Animated.Text>
                ))}
            </View>
            <Animated.Text style={[styles.body, { color: colors.muted }, rise(bodyDelay, 14)]}>
                {body}
            </Animated.Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    copy: {
        position: "absolute",
        left: 28,
        right: 28,
        alignItems: "center",
    },
    titleRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
    },
    title: {
        fontFamily: "Archivo-Bold",
        fontSize: 30,
        lineHeight: 34,
        letterSpacing: -0.9,
        textAlign: "center",
    },
    body: {
        marginTop: 14,
        maxWidth: 320,
        fontFamily: "Archivo-Medium",
        fontSize: 16.5,
        lineHeight: 23,
        textAlign: "center",
    },
});
