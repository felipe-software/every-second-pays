import type { DeepPartial, TabBarColors, TabBarConfig, TabBarOpacity } from "./constants";
import type { ComponentType, ReactNode } from "react";
import type { DimensionValue, StyleProp, TextStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export interface TabsIconProps {
    color: string;
    colors: Readonly<TabBarColors>;
    opacity: number;
    size: number;
}

export type TabsIcon = ComponentType<TabsIconProps>;

export interface TabsItem {
    accessibilityLabel?: string;
    key: string;
    label: string;
    labelStyle?: StyleProp<TextStyle>;
    activeIcon: TabsIcon;
    inactiveIcon: TabsIcon;
    badge?: number | string;
    badgeStyle?: StyleProp<TextStyle>;
    activeBadgeStyle?: StyleProp<TextStyle>;
    testID?: string;
}

export interface TabsChangeEvent {
    index: number;
    item: TabsItem;
}

export interface JellyTabBarHeadlessProps {
    backdrop?: ReactNode;
    colors?: Partial<TabBarColors>;
    config?: DeepPartial<TabBarConfig>;
    displayScale?: number;
    maxWidth?: DimensionValue;
    recording?: boolean;
    items: readonly TabsItem[];
    onTabChange?: (event: TabsChangeEvent) => void;
    onTabLongPress?: (event: TabsChangeEvent) => void;
    onTabPress?: (event: TabsChangeEvent) => boolean | void;
    opacity?: Partial<TabBarOpacity>;
    progress?: SharedValue<number>;
    selectedIndex?: number | null;
    selectedBackdrop?: ReactNode;
    touchFeedbackEnabled?: boolean;
    touchFeedbackColor?: string;
    touchFeedbackOpacity?: number;
    touchFeedbackScale?: number;
}
