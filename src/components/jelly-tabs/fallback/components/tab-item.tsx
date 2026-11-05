import { TABBAR_LAYOUT, type TabBarColors } from "../constants";
import type { TabsIcon } from "../types";
import { type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from "react-native";

import { TabBadge } from "./tab-badge";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

export interface TabItemProps {
    activeBadgeStyle?: StyleProp<TextStyle>;
    activeColor?: string;
    activeOpacity?: number;
    badge?: number | string;
    badgeStyle?: StyleProp<TextStyle>;
    displayScale?: number;
    colors: Readonly<TabBarColors>;
    activeIcon: TabsIcon;
    inactiveIcon: TabsIcon;
    iconSize?: number;
    inactiveColor?: string;
    inactiveOpacity?: number;
    itemHeight?: number;
    labelStyle?: StyleProp<TextStyle>;
    text: string;
    isActive?: boolean;
    animatedStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
}

const getTabAppearance = (props: TabItemProps) => {
    if (props.isActive) {
        return {
            badgeStyle: [props.badgeStyle, props.activeBadgeStyle],
            color: props.activeColor ?? "#000000",
            fontWeight: "700" as const,
            Icon: props.activeIcon,
            opacity: props.activeOpacity ?? 1,
        };
    }
    return {
        badgeStyle: props.badgeStyle,
        color: props.inactiveColor ?? "#afafaf",
        fontWeight: "400" as const,
        Icon: props.inactiveIcon,
        opacity: props.inactiveOpacity ?? 1,
    };
};

export const TabItem = (props: TabItemProps) => {
    const { animatedStyle, badge, colors, displayScale = 1, iconSize, labelStyle, text } = props;
    const itemHeight = props.itemHeight ?? TABBAR_LAYOUT.itemHeight * displayScale;
    const { badgeStyle, color, fontWeight, Icon, opacity } = getTabAppearance(props);

    return (
        <Animated.View style={[styles.item, { height: itemHeight }, animatedStyle]}>
            <View style={[styles.content, { opacity }]}>
                <View style={[styles.icon, { transform: [{ translateY: 2 * displayScale }] }]}>
                    <Icon
                        color={color}
                        colors={colors}
                        opacity={opacity}
                        size={iconSize ?? TABBAR_LAYOUT.iconSize * displayScale}
                    />
                    {badge !== undefined && <TabBadge badge={badge} displayScale={displayScale} style={badgeStyle} />}
                </View>
                <Text
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    selectable={false}
                    style={[
                        styles.label,
                        { color, fontSize: 13 * displayScale, fontWeight, paddingHorizontal: 4 * displayScale },
                        labelStyle,
                    ]}
                >
                    {text}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    item: {
        flex: 1,
        zIndex: 1,
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        position: "relative",
    },
    label: {
        alignSelf: "stretch",
        flexShrink: 1,
        textAlign: "center",
    },
});
