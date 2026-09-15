import {
    TabSlot,
    type TabsDescriptor,
    type TabsSlotRenderOptions,
    useTabTrigger,
} from "expo-router/ui";
import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
} from "react";
import { type ColorValue, type LayoutChangeEvent, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    cancelAnimation,
    Easing,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type AndroidTabPagerProps = PropsWithChildren<{
    backgroundColor: ColorValue;
}>;

type PagerSceneProps = PropsWithChildren<{
    index: number;
    isFocused: boolean;
    pageWidth: SharedValue<number>;
    position: SharedValue<number>;
}>;

type AndroidTabPagerContextValue = {
    position: SharedValue<number>;
};

const AndroidTabPagerContext = createContext<AndroidTabPagerContextValue | null>(null);

const LAST_PAGE_INDEX = 1;
const VELOCITY_PROJECTION_SECONDS = 0.18;

function clampPagePosition(value: number) {
    "worklet";
    return Math.min(Math.max(value, 0), LAST_PAGE_INDEX);
}

function PagerScene({ children, index, isFocused, pageWidth, position }: PagerSceneProps) {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: (index - position.get()) * pageWidth.get(),
        }],
    }));

    return (
        <Animated.View
            accessibilityElementsHidden={!isFocused}
            importantForAccessibility={isFocused ? "auto" : "no-hide-descendants"}
            pointerEvents={isFocused ? "auto" : "none"}
            style={[styles.scene, animatedStyle]}
        >
            {children}
        </Animated.View>
    );
}

export function useAndroidTabPagerProgress() {
    const context = useContext(AndroidTabPagerContext);

    if (!context) {
        throw new Error("useAndroidTabPagerProgress must be used inside AndroidTabPager");
    }

    return context.position;
}

export function AndroidTabPager({ backgroundColor, children }: AndroidTabPagerProps) {
    const indexTab = useTabTrigger({ name: "index" });
    const settingsTab = useTabTrigger({ name: "settings" });
    const selectedIndex = settingsTab.trigger?.isFocused ? 1 : 0;
    const pageWidth = useSharedValue(0);
    const position = useSharedValue(selectedIndex);
    const gestureStartPosition = useSharedValue(selectedIndex);
    const routerIndex = useSharedValue(selectedIndex);
    const contextValue = useMemo(() => ({ position }), [position]);

    useEffect(() => {
        routerIndex.set(selectedIndex);
        position.set(withTiming(selectedIndex, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
        }));
    }, [position, routerIndex, selectedIndex]);

    const switchToIndex = useCallback((index: number) => {
        const tab = index === 1 ? settingsTab : indexTab;
        tab.switchTab(index === 1 ? "settings" : "index", {});
    }, [indexTab, settingsTab]);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        pageWidth.set(event.nativeEvent.layout.width);
    }, [pageWidth]);

    const pan = Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .averageTouches(true)
        .onStart(() => {
            cancelAnimation(position);
            gestureStartPosition.set(position.get());
        })
        .onUpdate((event) => {
            const width = pageWidth.get();
            if (width <= 0) return;

            position.set(clampPagePosition(
                gestureStartPosition.get() - event.translationX / width,
            ));
        })
        .onEnd((event) => {
            const width = pageWidth.get();
            if (width <= 0) return;

            const projectedPosition = position.get()
                - (event.velocityX / width) * VELOCITY_PROJECTION_SECONDS;
            const targetIndex = Math.round(clampPagePosition(projectedPosition));

            position.set(withSpring(targetIndex, {
                damping: 28,
                mass: 0.8,
                overshootClamping: true,
                stiffness: 300,
                velocity: -event.velocityX / width,
            }, (finished) => {
                if (finished && targetIndex !== routerIndex.get()) {
                    scheduleOnRN(switchToIndex, targetIndex);
                }
            }));
        })
        .onFinalize((_event, success) => {
            if (success) return;
            position.set(withSpring(routerIndex.get(), {
                damping: 28,
                overshootClamping: true,
                stiffness: 300,
            }));
        });

    const renderScene = useCallback((
        descriptor: TabsDescriptor,
        options: TabsSlotRenderOptions,
    ) => {
        const index = descriptor.route.name === "index"
            ? 0
            : descriptor.route.name === "settings"
                ? 1
                : null;

        if (index === null) {
            return options.isFocused ? descriptor.render() : null;
        }

        return (
            <PagerScene
                index={index}
                isFocused={options.isFocused}
                pageWidth={pageWidth}
                position={position}
            >
                {descriptor.render()}
            </PagerScene>
        );
    }, [pageWidth, position]);

    return (
        <AndroidTabPagerContext.Provider value={contextValue}>
            <Animated.View style={[styles.pager, { backgroundColor }]}>
                <GestureDetector gesture={pan}>
                    <Animated.View onLayout={handleLayout} style={styles.viewport}>
                        <TabSlot
                            detachInactiveScreens={false}
                            renderFn={renderScene}
                            style={styles.slot}
                        />
                    </Animated.View>
                </GestureDetector>
                {children}
            </Animated.View>
        </AndroidTabPagerContext.Provider>
    );
}

const styles = StyleSheet.create({
    pager: {
        flex: 1,
        overflow: "hidden",
    },
    viewport: {
        flex: 1,
        overflow: "hidden",
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
});
