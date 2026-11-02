import type { TabBarColors, TabBarOpacity } from "../constants";
import { TabItem } from "../components/tab-item";
import type { TabsItem } from "../types";
import { areItemsEqual } from "../utils/navigation-tab-bar";
import { clamp01 } from "../utils/tab-bar-visuals";
import { useStableArray } from "./use-stable-array";
import { useMemo } from "react";

interface TabElementsOptions {
    displayScale: number;
    iconSize: number;
    itemHeight: number;
    items: readonly TabsItem[];
    resolvedColors: TabBarColors;
    resolvedOpacity: TabBarOpacity;
}

export const useTabElements = ({
    displayScale,
    iconSize,
    itemHeight,
    items,
    resolvedColors,
    resolvedOpacity,
}: TabElementsOptions) => {
    const renderedItems = useStableArray(items, areItemsEqual);
    const tabs = useMemo(
        () =>
            renderedItems.map((item) => (
                <TabItem
                    activeBadgeStyle={item.activeBadgeStyle}
                    activeColor={resolvedColors.activeContent}
                    activeOpacity={clamp01(resolvedOpacity.activeContent)}
                    activeIcon={item.activeIcon}
                    badge={item.badge}
                    badgeStyle={item.badgeStyle}
                    colors={resolvedColors}
                    displayScale={displayScale}
                    iconSize={iconSize}
                    inactiveIcon={item.inactiveIcon}
                    inactiveColor={resolvedColors.inactiveContent}
                    inactiveOpacity={clamp01(resolvedOpacity.inactiveContent)}
                    itemHeight={itemHeight}
                    key={item.key}
                    labelStyle={item.labelStyle}
                    text={item.label}
                />
            )),
        [
            displayScale,
            itemHeight,
            iconSize,
            renderedItems,
            resolvedColors,
            resolvedOpacity.activeContent,
            resolvedOpacity.inactiveContent,
        ],
    );

    return { renderedItems, tabs };
};
