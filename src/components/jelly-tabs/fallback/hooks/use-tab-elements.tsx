import { useMemo } from "react";

import { TabItem } from "../components/tab-item";
import type { TabBarColors, TabBarOpacity } from "../constants";
import type { TabsItem } from "../types";
import { clamp01 } from "./use-tab-bar-appearance";

interface TabElementsOptions {
    colors: TabBarColors;
    displayScale: number;
    iconSize: number;
    itemHeight: number;
    items: readonly TabsItem[];
    opacity: TabBarOpacity;
}

export const useTabElements = ({ colors, displayScale, iconSize, itemHeight, items, opacity }: TabElementsOptions) =>
    useMemo(
        () =>
            items.map((item) => (
                <TabItem
                    activeBadgeStyle={item.activeBadgeStyle}
                    activeColor={colors.activeContent}
                    activeOpacity={clamp01(opacity.activeContent)}
                    activeIcon={item.activeIcon}
                    badge={item.badge}
                    badgeStyle={item.badgeStyle}
                    colors={colors}
                    displayScale={displayScale}
                    iconSize={iconSize}
                    inactiveIcon={item.inactiveIcon}
                    inactiveColor={colors.inactiveContent}
                    inactiveOpacity={clamp01(opacity.inactiveContent)}
                    itemHeight={itemHeight}
                    key={item.key}
                    labelStyle={item.labelStyle}
                    text={item.label}
                />
            )),
        [colors, displayScale, iconSize, itemHeight, items, opacity.activeContent, opacity.inactiveContent],
    );
