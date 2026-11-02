import { useReleasingSharedObject } from "expo-modules-core";
import { useEffect } from "react";
import { type NativeSyntheticEvent, processColor, StyleSheet } from "react-native";
import { type SharedValue, useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { createSerializable } from "react-native-worklets";

import { AccessibilityTabsRow } from "./accessibility-tabs-row";
import { JellyTabs, NativeJellyTabBar } from "./native-jelly-tab-bar";

const NO_SELECTION = -1;

export type JellyTabItem = {
    accessibilityLabel: string;
    iconPath: string;
    key: string;
    label: string;
    testID: string;
};

type JellyTabBarColors = {
    accent: string;
    activeContent: string;
    inactiveContent: string;
    outline: string;
    surface: string;
};

type JellyTabBarProps = {
    colors: JellyTabBarColors;
    items: readonly JellyTabItem[];
    onTabPress: (index: number) => void;
    progress: SharedValue<number>;
    selectedIndex: number | null;
};

function toNativeColor(color: string) {
    const nativeColor = processColor(color);
    if (typeof nativeColor !== "number") {
        throw new Error(`Unsupported tab bar color: ${color}`);
    }
    return nativeColor;
}

export function JellyTabBar({ colors, items, onTabPress, progress, selectedIndex }: JellyTabBarProps) {
    const controller = useReleasingSharedObject(() => new JellyTabs.JellyTabBarController(), []);
    const lastPublishedProgress = useSharedValue(Number.NaN);

    useEffect(() => {
        controller.setProgressListener(
            createSerializable((next: number) => {
                "worklet";
                lastPublishedProgress.set(next);
                progress.set(next);
            }),
        );
    }, [controller, lastPublishedProgress, progress]);

    useAnimatedReaction(
        () => progress.get(),
        (next) => {
            if (next !== lastPublishedProgress.get()) controller.setProgress(next);
        },
        [controller],
    );

    const handleTabPress = (event: NativeSyntheticEvent<{ index: number }>) => {
        onTabPress(event.nativeEvent.index);
    };
    const activateTab = (index: number) => controller.activateTab(index);

    return (
        <>
            <NativeJellyTabBar
                accentColor={toNativeColor(colors.accent)}
                activeContentColor={toNativeColor(colors.activeContent)}
                controller={controller}
                iconPaths={items.map((item) => item.iconPath)}
                inactiveContentColor={toNativeColor(colors.inactiveContent)}
                labels={items.map((item) => item.label)}
                onTabPress={handleTabPress}
                outlineColor={toNativeColor(colors.outline)}
                selectedIndex={selectedIndex ?? NO_SELECTION}
                style={StyleSheet.absoluteFill}
                surfaceColor={toNativeColor(colors.surface)}
            />
            <AccessibilityTabsRow items={items} onActivate={activateTab} selectedIndex={selectedIndex} />
        </>
    );
}
