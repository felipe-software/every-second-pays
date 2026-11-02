import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { ExternalLink } from "@/components/external-link";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { Spacing } from "@/constants/theme";

export function ExploreSections() {
    return (
        <ThemedView style={styles.sectionsWrapper}>
            <Collapsible title="File-based routing">
                <ThemedText type="small">
                    This app has two screens: <ThemedText type="code">src/app/index.tsx</ThemedText> and{" "}
                    <ThemedText type="code">src/app/explore.tsx</ThemedText>
                </ThemedText>
                <ThemedText type="small">
                    The layout file in <ThemedText type="code">src/app/_layout.tsx</ThemedText> sets up the tab
                    navigator.
                </ThemedText>
                <ExternalLink href="https://docs.expo.dev/router/introduction">
                    <ThemedText type="linkPrimary">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>

            <Collapsible title="Android, iOS, and web support">
                <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
                    <ThemedText type="small">
                        You can open this project on Android, iOS, and the web. To open the web version, press{" "}
                        <ThemedText type="smallBold">w</ThemedText> in the terminal running this project.
                    </ThemedText>
                    <Image source={require("@/assets/images/tutorial-web.png")} style={styles.imageTutorial} />
                </ThemedView>
            </Collapsible>

            <Collapsible title="Images">
                <ThemedText type="small">
                    For static images, you can use the <ThemedText type="code">@2x</ThemedText> and{" "}
                    <ThemedText type="code">@3x</ThemedText> suffixes to provide files for different screen densities.
                </ThemedText>
                <Image source={require("@/assets/images/react-logo.png")} style={styles.imageReact} />
                <ExternalLink href="https://reactnative.dev/docs/images">
                    <ThemedText type="linkPrimary">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>

            <Collapsible title="Light and dark mode components">
                <ThemedText type="small">
                    This template has light and dark mode support. The{" "}
                    <ThemedText type="code">useColorScheme()</ThemedText> hook lets you inspect what the user&apos;s
                    current color scheme is, and so you can adjust UI colors accordingly.
                </ThemedText>
                <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
                    <ThemedText type="linkPrimary">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>

            <Collapsible title="Animations">
                <ThemedText type="small">
                    This template includes an example of an animated component. The{" "}
                    <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText> component uses the powerful{" "}
                    <ThemedText type="code">react-native-reanimated</ThemedText> library to animate opening this hint.
                </ThemedText>
            </Collapsible>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    sectionsWrapper: {
        gap: Spacing.five,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
    },
    collapsibleContent: {
        alignItems: "center",
    },
    imageTutorial: {
        width: "100%",
        aspectRatio: 296 / 171,
        borderRadius: Spacing.three,
        marginTop: Spacing.two,
    },
    imageReact: {
        width: 100,
        height: 100,
        alignSelf: "center",
    },
});
