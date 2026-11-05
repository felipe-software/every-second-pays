import { usePathname } from "expo-router";
import { TabSlot, type TabsDescriptor, type TabsSlotRenderOptions, useTabTrigger } from "expo-router/ui";
import { createContext, type PropsWithChildren, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Easing, type SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

const TabBarProgressContext = createContext<SharedValue<number> | null>(null);

const TAB_SWITCH = { duration: 260, easing: Easing.out(Easing.cubic) };
const KEPT_ALIVE_TABS = new Set(["index", "settings"]);

type TabSceneProps = PropsWithChildren<{
    isFocused: boolean;
}>;

// display: none would zero the layout and lose scroll positions.
function TabScene({ children, isFocused }: TabSceneProps) {
    return (
        <View
            accessibilityElementsHidden={!isFocused}
            importantForAccessibility={isFocused ? "auto" : "no-hide-descendants"}
            pointerEvents={isFocused ? "auto" : "none"}
            style={[styles.scene, isFocused ? styles.focused : styles.hidden]}
        >
            {children}
        </View>
    );
}

function renderTabScene(descriptor: TabsDescriptor, { isFocused, loaded }: TabsSlotRenderOptions) {
    if (!KEPT_ALIVE_TABS.has(descriptor.route.name)) {
        return isFocused ? descriptor.render() : null;
    }

    if (!loaded && !isFocused) return null;

    return <TabScene isFocused={isFocused}>{descriptor.render()}</TabScene>;
}

export function useIsTabSubpage() {
    return usePathname().split("/").filter(Boolean).length > 1;
}

export function useTabBarProgress() {
    const progress = useContext(TabBarProgressContext);

    if (!progress) {
        throw new Error("useTabBarProgress must be used inside AndroidTabScreens");
    }

    return progress;
}

export function AndroidTabScreens({ children }: PropsWithChildren) {
    const settingsTab = useTabTrigger({ name: "settings" });
    const selectedIndex = settingsTab.trigger?.isFocused ? 1 : 0;
    const progress = useSharedValue(selectedIndex);

    useEffect(() => {
        progress.set(withTiming(selectedIndex, TAB_SWITCH));
    }, [progress, selectedIndex]);

    return (
        <TabBarProgressContext.Provider value={progress}>
            <View style={styles.screens}>
                <TabSlot detachInactiveScreens={false} renderFn={renderTabScene} style={styles.slot} />
                {children}
            </View>
        </TabBarProgressContext.Provider>
    );
}

const styles = StyleSheet.create({
    screens: {
        flex: 1,
    },
    slot: {
        flex: 1,
    },
    scene: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    focused: {
        zIndex: 1,
    },
    hidden: {
        opacity: 0,
        zIndex: 0,
    },
});
