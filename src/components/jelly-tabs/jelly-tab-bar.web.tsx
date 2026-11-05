import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { JellyTabBarHeadless, type TabsIcon, type TabsIconProps, type TabsItem } from "react-native-jelly-tabs";

import type { JellyTabBar as NativeJellyTabBar } from "./jelly-tab-bar";

type JellyTabBarProps = Parameters<typeof NativeJellyTabBar>[0];

const TRACK_HEIGHT = 64;
const ITEM_HEIGHT = 56;
const PILL_PRESSED_SCALE = 1.2;
const BAR_PRESSED_SCALE = 1.1;
const pathIcons = new Map<string, TabsIcon>();

function pathIcon(path: string) {
    const cached = pathIcons.get(path);
    if (cached) return cached;
    const Icon = ({ color, size }: TabsIconProps) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d={path} />
        </Svg>
    );
    pathIcons.set(path, Icon);
    return Icon;
}

export function JellyTabBar({ colors, contentStyle, items, onTabPress, selectedIndex }: JellyTabBarProps) {
    const tabs = useMemo<TabsItem[]>(
        () =>
            items.map((item) => ({
                accessibilityLabel: item.accessibilityLabel,
                activeIcon: pathIcon(item.iconPath),
                inactiveIcon: pathIcon(item.inactiveIconPath ?? item.iconPath),
                key: item.key,
                label: item.label,
                labelStyle: { fontFamily: contentStyle?.inactiveLabelFontFamily },
                testID: item.testID,
            })),
        [contentStyle?.inactiveLabelFontFamily, items],
    );

    return (
        <JellyTabBarHeadless
            backdrop={
                <View style={[styles.trackFace, { backgroundColor: colors.surface, borderColor: colors.outline }]} />
            }
            colors={{
                activeContent: colors.activeContent,
                inactiveContent: colors.inactiveContent,
                selectedSurface: colors.accent,
                surface: "transparent",
            }}
            config={{
                distortion: { pressedScale: BAR_PRESSED_SCALE },
                layout: { iconSize: contentStyle?.iconSize, itemHeight: ITEM_HEIGHT, trackHeight: TRACK_HEIGHT },
                pillJelly: { pressedScale: PILL_PRESSED_SCALE },
            }}
            items={tabs}
            maxWidth="100%"
            onTabPress={({ index }) => {
                onTabPress(index);
                return true;
            }}
            selectedIndex={selectedIndex}
            touchFeedbackColor={colors.accent}
        />
    );
}

const styles = StyleSheet.create({
    trackFace: {
        ...StyleSheet.absoluteFill,
        borderRadius: TRACK_HEIGHT / 2,
        borderWidth: 1,
    },
});
