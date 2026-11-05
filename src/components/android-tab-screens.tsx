import { usePathname } from "expo-router";
import { TabSlot, type TabsDescriptor, type TabsSlotRenderOptions, useTabTrigger } from "expo-router/ui";
import { createContext, type PropsWithChildren, useContext, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Easing, type SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

const TabBarProgressContext = createContext<SharedValue<number> | null>(null);

const TAB_SWITCH = { duration: 260, easing: Easing.out(Easing.cubic) };

// Only the focused tab stays mounted, so switching tabs remounts the page it opens.
function renderFocusedScreen(descriptor: TabsDescriptor, { isFocused }: TabsSlotRenderOptions) {
    return isFocused ? descriptor.render() : null;
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
                <TabSlot detachInactiveScreens={false} renderFn={renderFocusedScreen} style={styles.slot} />
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
});
