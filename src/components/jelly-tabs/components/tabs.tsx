import {
    AccessibilityTabsRow,
    type AnimatedViewStyle,
    InactiveTabsRow,
    PillLayer,
    SelectedTabIndexContext,
    SurfaceLayer,
    type TabBarGeometry,
    type TabElements,
    TouchFeedbackLayer,
    type TouchFeedbackVisuals,
} from "./tab-bar-layers";
import { TabItem } from "./tab-item";
import {
    DEFAULT_TAB_BAR_COLORS,
    DEFAULT_TAB_BAR_OPACITY,
    resolveTabBarConfig,
    type TabBarConfig,
} from "../constants";
import type { JellyTabBarHeadlessProps, TabsItem } from "../types";
import { useIsomorphicLayoutEffect } from "../hooks/use-isomorphic-layout-effect";
import { usePillJelly } from "../hooks/use-pill-jelly";
import { useShallowStable } from "../hooks/use-shallow-stable";
import { useStableArray } from "../hooks/use-stable-array";
import { areItemsEqual } from "../utils/navigation-tab-bar";
import {
    memo,
    type ReactNode,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Dimensions,
    type DimensionValue,
    type LayoutChangeEvent,
    Platform,
    StyleSheet,
    View,
    type ViewStyle,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

const getSelectedItemIndex = (
    selectedIndex: number | null,
    itemCount: number,
) => {
    if (
        selectedIndex === null ||
        !Number.isFinite(selectedIndex) ||
        selectedIndex < 0 ||
        itemCount === 0
    ) {
        return null;
    }

    return Math.min(selectedIndex, itemCount - 1);
};

const getGeometry = (
    layout: TabBarConfig["layout"],
    displayScale: number,
): TabBarGeometry => ({
    itemHeight: layout.itemHeight * displayScale,
    maskOverscanX: layout.maskOverscanX * displayScale,
    maskOverscanY: layout.maskOverscanY * displayScale,
    trackHeight: layout.trackHeight * displayScale,
    trackInset: layout.trackInset * displayScale,
});

const getTouchFeedbackVisuals = (
    config: TabBarConfig["distortion"]["touchFeedback"],
    displayScale: number,
    overrides: { color: string; opacity?: number; scale?: number },
): TouchFeedbackVisuals => {
    const centerOpacity = clamp01(overrides.opacity ?? config.opacity);
    const radius =
        config.radius *
        Math.max(overrides.scale ?? config.scale, 0) *
        displayScale;

    return {
        centerOpacity,
        color: overrides.color,
        diameter: radius * 2,
        middleOpacity: centerOpacity * config.middleOpacityRatio,
        radius,
    };
};

interface TabBarBodyProps {
    activeItemStyle: AnimatedViewStyle;
    backdrop: ReactNode;
    geometry: TabBarGeometry;
    gesture: ReturnType<typeof usePillJelly>["gesture"];
    items: readonly TabsItem[];
    maxWidth: DimensionValue;
    onActivate: (index: number) => void;
    onLongPress?: (index: number) => void;
    onTrackLayout: (event: LayoutChangeEvent) => void;
    panelStyle: AnimatedViewStyle;
    pillClipStyle?: AnimatedViewStyle;
    pillContentStyle?: AnimatedViewStyle;
    pillMaskStyle?: AnimatedViewStyle;
    pillVisible: boolean;
    pressedStyle: AnimatedViewStyle;
    selectedBackdrop: ReactNode;
    selectedSurfaceColor: string;
    selectedSurfaceOpacity: number;
    surfaceColor: string;
    surfaceOpacity: number;
    tabbarOriginStyle: ViewStyle;
    tabbarStyle: AnimatedViewStyle;
    tabCount: number;
    tabs: TabElements;
    touchFeedback?: TouchFeedbackVisuals;
    touchFeedbackStyle: AnimatedViewStyle;
    trackRef: RefObject<View | null>;
    webTrackWidth: number;
}

// Everything below the gesture detector only depends on stable or rarely
// changing values, so a selection change re-renders the accessibility row
// alone (through SelectedTabIndexContext) instead of every visual layer.
const TabBarBody = memo(function TabBarBody({
    activeItemStyle,
    backdrop,
    geometry,
    gesture,
    items,
    maxWidth,
    onActivate,
    onLongPress,
    onTrackLayout,
    panelStyle,
    pillClipStyle,
    pillContentStyle,
    pillMaskStyle,
    pillVisible,
    pressedStyle,
    selectedBackdrop,
    selectedSurfaceColor,
    selectedSurfaceOpacity,
    surfaceColor,
    surfaceOpacity,
    tabbarOriginStyle,
    tabbarStyle,
    tabCount,
    tabs,
    touchFeedback,
    touchFeedbackStyle,
    trackRef,
    webTrackWidth,
}: TabBarBodyProps) {
    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                collapsable={false}
                style={[
                    styles.pressWrapper,
                    { height: geometry.trackHeight, maxWidth },
                    pressedStyle,
                ]}
            >
                <Animated.View
                    collapsable={false}
                    pointerEvents="box-only"
                    ref={trackRef}
                    testID="tabs-drag-surface"
                    style={[
                        styles.track,
                        { height: geometry.trackHeight },
                        tabbarOriginStyle,
                        tabbarStyle,
                    ]}
                    onLayout={onTrackLayout}
                >
                    <Animated.View
                        accessibilityElementsHidden
                        aria-hidden
                        importantForAccessibility="no-hide-descendants"
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, panelStyle]}
                    >
                        <SurfaceLayer
                            backdrop={backdrop}
                            color={surfaceColor}
                            opacity={surfaceOpacity}
                            radius={geometry.trackHeight / 2}
                        />

                        {touchFeedback && (
                            <TouchFeedbackLayer
                                animatedStyle={touchFeedbackStyle}
                                radius={geometry.trackHeight / 2}
                                visuals={touchFeedback}
                            />
                        )}

                        <InactiveTabsRow
                            tabs={tabs}
                            trackInset={geometry.trackInset}
                        />

                        <PillLayer
                            activeItemStyle={activeItemStyle}
                            clipStyle={pillClipStyle}
                            contentStyle={pillContentStyle}
                            geometry={geometry}
                            maskStyle={pillMaskStyle}
                            selectedBackdrop={selectedBackdrop}
                            selectedSurfaceColor={selectedSurfaceColor}
                            selectedSurfaceOpacity={selectedSurfaceOpacity}
                            tabCount={tabCount}
                            tabs={tabs}
                            touchFeedback={touchFeedback}
                            touchFeedbackStyle={touchFeedbackStyle}
                            visible={pillVisible}
                            webTrackWidth={webTrackWidth}
                        />
                    </Animated.View>

                    <AccessibilityTabsRow
                        items={items}
                        onActivate={onActivate}
                        onLongPress={onLongPress}
                        trackInset={geometry.trackInset}
                    />
                </Animated.View>
            </Animated.View>
        </GestureDetector>
    );
});

export const JellyTabBarHeadless = ({
    backdrop,
    colors,
    config,
    displayScale = 1,
    items,
    maxWidth = 400,
    onTabChange,
    onTabLongPress,
    onTabPress,
    opacity,
    progress,
    recording = false,
    selectedIndex,
    selectedBackdrop,
    touchFeedbackColor,
    touchFeedbackEnabled = true,
    touchFeedbackOpacity,
    touchFeedbackScale,
}: JellyTabBarHeadlessProps) => {
    const trackRef = useRef<View>(null);
    const [uncontrolledSelectedIndex, setUncontrolledSelectedIndex] =
        useState(0);
    // Web only: the pill clip box is statically sized from the measured track
    // width so its animation stays transform-only. Unused on native.
    const [webTrackWidth, setWebTrackWidth] = useState(0);
    const resolvedConfig = useMemo(() => resolveTabBarConfig(config), [config]);
    const stableColors = useShallowStable(colors);
    const stableOpacity = useShallowStable(opacity);
    const resolvedColors = useMemo(
        () => ({
            ...DEFAULT_TAB_BAR_COLORS,
            ...stableColors,
        }),
        [stableColors],
    );
    const resolvedOpacity = useMemo(
        () => ({
            ...DEFAULT_TAB_BAR_OPACITY,
            ...stableOpacity,
        }),
        [stableOpacity],
    );
    const geometry = useMemo(
        () => getGeometry(resolvedConfig.layout, displayScale),
        [displayScale, resolvedConfig.layout],
    );
    const iconSize = resolvedConfig.layout.iconSize * displayScale;
    const touchFeedbackColorValue =
        touchFeedbackColor ?? resolvedColors.selectedSurface;
    const touchFeedback = useMemo(
        () =>
            getTouchFeedbackVisuals(
                resolvedConfig.distortion.touchFeedback,
                displayScale,
                {
                    color: touchFeedbackColorValue,
                    opacity: touchFeedbackOpacity,
                    scale: touchFeedbackScale,
                },
            ),
        [
            displayScale,
            resolvedConfig.distortion.touchFeedback,
            touchFeedbackColorValue,
            touchFeedbackOpacity,
            touchFeedbackScale,
        ],
    );

    // The handlers read the latest props when they run, so new callback or
    // item identities do not rebuild the gesture and its worklets.
    const latestProps = useRef({
        items,
        onTabChange,
        onTabLongPress,
        onTabPress,
    });
    useIsomorphicLayoutEffect(() => {
        latestProps.current = {
            items,
            onTabChange,
            onTabLongPress,
            onTabPress,
        };
    });

    const handleTabChange = useCallback((index: number) => {
        const { items: currentItems, onTabChange: onChange } =
            latestProps.current;
        const item = currentItems[index];
        if (item) {
            setUncontrolledSelectedIndex(index);
            onChange?.({ index, item });
        }
    }, []);
    const handleTabLongPress = useCallback((index: number) => {
        const { items: currentItems, onTabLongPress: onLongPress } =
            latestProps.current;
        const item = currentItems[index];
        if (item) {
            onLongPress?.({ index, item });
        }
    }, []);
    const handleTabPress = useCallback((index: number) => {
        const { items: currentItems, onTabPress: onPress } =
            latestProps.current;
        const item = currentItems[index];
        if (item) {
            return onPress?.({ index, item });
        }

        return false;
    }, []);

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
                    itemHeight={geometry.itemHeight}
                    key={item.key}
                    labelStyle={item.labelStyle}
                    text={item.label}
                />
            )),
        [
            displayScale,
            geometry.itemHeight,
            iconSize,
            renderedItems,
            resolvedColors,
            resolvedOpacity.activeContent,
            resolvedOpacity.inactiveContent,
        ],
    );
    const tabCount = tabs.length;
    const semanticSelectedIndex = getSelectedItemIndex(
        selectedIndex === undefined ? uncontrolledSelectedIndex : selectedIndex,
        tabCount,
    );
    const hasTabLongPress = Boolean(onTabLongPress);
    const {
        activateTab,
        activeItemStyle,
        gesture,
        panelStyle,
        pillClipStyle,
        pillContentStyle,
        pillMaskStyle,
        pressedStyle,
        setTrackWidth,
        setWebTrackPageX,
        tabbarOriginStyle,
        tabbarStyle,
        touchFeedbackStyle,
    } = usePillJelly(
        tabCount,
        resolvedConfig,
        recording,
        displayScale,
        touchFeedback.radius,
        selectedIndex,
        progress,
        handleTabChange,
        onTabPress ? handleTabPress : undefined,
        hasTabLongPress ? handleTabLongPress : undefined,
    );
    const measureWebTrackPageX = useCallback(() => {
        trackRef.current?.measureInWindow((x) => setWebTrackPageX(x));
    }, [setWebTrackPageX]);
    const handleTrackLayout = useCallback(
        (event: LayoutChangeEvent) => {
            setTrackWidth(event.nativeEvent.layout.width);
            if (Platform.OS === "web") {
                setWebTrackWidth(event.nativeEvent.layout.width);
                measureWebTrackPageX();
            }
        },
        [measureWebTrackPageX, setTrackWidth],
    );

    useEffect(() => {
        if (Platform.OS !== "web") {
            return;
        }

        // A centered track can move when the viewport is resized without
        // changing its own width, so onLayout alone will not run again.
        const subscription = Dimensions.addEventListener(
            "change",
            measureWebTrackPageX,
        );

        return () => subscription.remove();
    }, [measureWebTrackPageX]);

    return (
        <SelectedTabIndexContext.Provider value={semanticSelectedIndex}>
            <TabBarBody
                activeItemStyle={activeItemStyle}
                backdrop={backdrop}
                geometry={geometry}
                gesture={gesture}
                items={renderedItems}
                maxWidth={maxWidth}
                onActivate={activateTab}
                onLongPress={hasTabLongPress ? handleTabLongPress : undefined}
                onTrackLayout={handleTrackLayout}
                panelStyle={panelStyle}
                pillClipStyle={pillClipStyle}
                pillContentStyle={pillContentStyle}
                pillMaskStyle={pillMaskStyle}
                pillVisible={semanticSelectedIndex !== null}
                pressedStyle={pressedStyle}
                selectedBackdrop={selectedBackdrop}
                selectedSurfaceColor={resolvedColors.selectedSurface}
                selectedSurfaceOpacity={clamp01(
                    resolvedOpacity.selectedSurface,
                )}
                surfaceColor={resolvedColors.surface}
                surfaceOpacity={clamp01(resolvedOpacity.surface)}
                tabbarOriginStyle={tabbarOriginStyle}
                tabbarStyle={tabbarStyle}
                tabCount={tabCount}
                tabs={tabs}
                touchFeedback={touchFeedbackEnabled ? touchFeedback : undefined}
                touchFeedbackStyle={touchFeedbackStyle}
                trackRef={trackRef}
                webTrackWidth={webTrackWidth}
            />
        </SelectedTabIndexContext.Provider>
    );
};

/** @deprecated Use JellyTabBarHeadless instead. */
export const JellyTabs = JellyTabBarHeadless;

const styles = StyleSheet.create({
    pressWrapper: {
        alignSelf: "center",
        width: "100%",
        // Stop the label/icon glyphs from being text-selected on web; harmless on native.
        userSelect: "none",
    },
    track: {
        position: "relative",
        width: "100%",
        overflow: "visible",
    },
});
