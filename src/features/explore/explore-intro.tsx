import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { ExternalLink } from "@/components/external-link";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export function ExploreIntro({ iconColor }: { iconColor: string }) {
    return (
        <ThemedView style={styles.titleContainer}>
            <ThemedText type="subtitle">Explore</ThemedText>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
                This starter app includes example{"\n"}code to help you get started.
            </ThemedText>

            <ExternalLink href="https://docs.expo.dev" asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.linkButton}>
                        <ThemedText type="link">Expo documentation</ThemedText>
                        <SymbolView
                            tintColor={iconColor}
                            name={{
                                ios: "arrow.up.right.square",
                                android: "link",
                                web: "link",
                            }}
                            size={12}
                        />
                    </ThemedView>
                </Pressable>
            </ExternalLink>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        gap: Spacing.three,
        alignItems: "center",
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.six,
    },
    centerText: {
        textAlign: "center",
    },
    pressed: {
        opacity: 0.7,
    },
    linkButton: {
        flexDirection: "row",
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two,
        borderRadius: Spacing.five,
        justifyContent: "center",
        gap: Spacing.one,
        alignItems: "center",
    },
});
