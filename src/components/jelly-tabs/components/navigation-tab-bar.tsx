import { resolveTabBarConfig } from "../constants";
import type { JellyTabBarProps, TabsItem } from "../types";
import { useNavigationColors } from "../hooks/use-navigation-colors";
import { useStableArray } from "../hooks/use-stable-array";
import {
    getNavigationItems,
    getVisibleRoutes,
    getVisibleSelectedIndex,
    longPressNavigationTab,
    pressNavigationTab,
} from "../utils/navigation";
import { areItemsEqual, areRoutesEqual } from "../utils/navigation-tab-bar";
import { JellyTabBarHeadless } from "./tabs";
import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";

export const JellyTabBar = ({
    backdrop,
    colors,
    config,
    containerStyle,
    descriptors,
    displayScale = 1,
    floating = false,
    insets,
    maxWidth = 400,
    navigation,
    state,
    ...headlessProps
}: JellyTabBarProps) => {
    const visibleRoutes = useStableArray(getVisibleRoutes(state.routes, descriptors), areRoutesEqual);
    const focusedRoute = state.routes[state.index];
    const selectedIndex = getVisibleSelectedIndex(visibleRoutes, focusedRoute?.key);
    const focusedOptions = focusedRoute ? descriptors[focusedRoute.key]?.options : undefined;
    const resolvedConfig = useMemo(() => resolveTabBarConfig(config), [config]);
    const trackHeight = resolvedConfig.layout.trackHeight * displayScale;

    const items = useStableArray<TabsItem>(getNavigationItems(visibleRoutes, descriptors), areItemsEqual);

    const navigationColors = useNavigationColors(colors, focusedOptions);

    const handleTabPress = useCallback(
        ({ index }: { index: number }) => {
            return pressNavigationTab({
                focusedRouteKey: focusedRoute?.key,
                index,
                navigation,
                stateKey: state.key,
                visibleRoutes,
            });
        },
        [focusedRoute?.key, navigation, state.key, visibleRoutes],
    );

    const handleTabLongPress = useCallback(
        ({ index }: { index: number }) => {
            longPressNavigationTab({
                index,
                navigation,
                visibleRoutes,
            });
        },
        [navigation, visibleRoutes],
    );

    return (
        <View
            // The full-width container's empty strips must not swallow touches meant for content behind it.
            pointerEvents="box-none"
            style={[
                styles.container,
                {
                    paddingBottom: insets.bottom + 12,
                    paddingLeft: insets.left + 20,
                    paddingRight: insets.right + 20,
                },
                focusedOptions?.tabBarStyle,
                floating && styles.floating,
                containerStyle,
            ]}
        >
            <View style={[styles.bar, { height: trackHeight, maxWidth }]}>
                <JellyTabBarHeadless
                    {...headlessProps}
                    backdrop={backdrop ?? focusedOptions?.tabBarBackground?.()}
                    colors={navigationColors}
                    config={config}
                    displayScale={displayScale}
                    items={items}
                    onTabLongPress={handleTabLongPress}
                    onTabPress={handleTabPress}
                    selectedIndex={selectedIndex}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bar: {
        alignSelf: "center",
        width: "100%",
    },
    container: {
        paddingTop: 12,
        width: "100%",
    },
    floating: {
        bottom: 0,
        left: 0,
        position: "absolute",
        right: 0,
        zIndex: 1,
    },
});
