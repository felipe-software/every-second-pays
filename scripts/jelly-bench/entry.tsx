import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { type ComponentType, useEffect, useState } from "react";
import { Linking, StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
    Easing,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type BarProps = {
    onSelect: (index: number) => void;
    progress: SharedValue<number>;
    selectedIndex: number;
};

type PageProps = {
    color: string;
    index: number;
    position: SharedValue<number>;
};

const PAID_ICON_PATH = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91 2.02.52 4.18 1.39 4.18 3.91-.01 1.83-1.38 2.83-3.12 3.16Z";
const SETTINGS_ICON_PATH = "M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.2 7.2 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z";
const COLORS = {
    accent: "#D8819C",
    activeContent: "#FFF5F8",
    canvas: "#FBF5F6",
    inactiveContent: "#4A3A40",
    outline: "#E0CFD4",
    secondPage: "#F1EDF7",
    surface: "#FFFCFD",
};
const LABELS = ["Revenus", "Réglages"];
const PAGE_TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

function loadNativeBar(): ComponentType<BarProps> {
    const { JellyTabBar } = require("@/components/jelly-tabs");
    const items = [
        { accessibilityLabel: LABELS[0], iconPath: PAID_ICON_PATH, key: "index", label: LABELS[0], testID: "today-tab" },
        { accessibilityLabel: LABELS[1], iconPath: SETTINGS_ICON_PATH, key: "settings", label: LABELS[1], testID: "settings-tab" },
    ];

    return function NativeBar({ onSelect, progress, selectedIndex }) {
        return (
            <JellyTabBar
                colors={{
                    accent: COLORS.accent,
                    activeContent: COLORS.activeContent,
                    inactiveContent: COLORS.inactiveContent,
                    outline: COLORS.outline,
                    surface: COLORS.surface,
                }}
                items={items}
                onTabPress={onSelect}
                progress={progress}
                selectedIndex={selectedIndex}
            />
        );
    };
}

function loadReanimatedBar(): ComponentType<BarProps> {
    const { JellyTabBarHeadless } = require("./.old-fork/src/components/jelly-tabs");
    const { default: Svg, Path } = require("react-native-svg");
    const icon = (path: string) => function BarIcon({ color, size }: { color: string; size: number }) {
        return (
            <Svg fill={color} height={size} viewBox="0 0 24 24" width={size}>
                <Path d={path} />
            </Svg>
        );
    };
    const paidIcon = icon(PAID_ICON_PATH);
    const settingsIcon = icon(SETTINGS_ICON_PATH);
    const items = [
        { accessibilityLabel: LABELS[0], activeIcon: paidIcon, inactiveIcon: paidIcon, key: "index", label: LABELS[0], testID: "today-tab" },
        { accessibilityLabel: LABELS[1], activeIcon: settingsIcon, inactiveIcon: settingsIcon, key: "settings", label: LABELS[1], testID: "settings-tab" },
    ];
    const config = {
        distortion: { pressedScale: 1.1 },
        layout: { iconSize: 23, itemHeight: 56, trackHeight: 64 },
        pillJelly: { frameConfig: {}, pressedScale: 1.2 },
    };
    const barColors = {
        activeContent: COLORS.activeContent,
        inactiveContent: COLORS.inactiveContent,
        selectedSurface: COLORS.accent,
        surface: "transparent",
    };
    const backdrop = <View style={styles.trackFace} />;

    return function ReanimatedBar({ onSelect, progress, selectedIndex }) {
        return (
            <JellyTabBarHeadless
                backdrop={backdrop}
                colors={barColors}
                config={config}
                items={items}
                maxWidth={188}
                onTabPress={({ index }: { index: number }) => {
                    onSelect(index);
                    return true;
                }}
                progress={progress}
                selectedIndex={selectedIndex}
                touchFeedbackColor={COLORS.accent}
            />
        );
    };
}

function Page({ color, index, position }: PageProps) {
    const { width } = useWindowDimensions();
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: (index - position.get()) * width }],
    }));

    return <Animated.View style={[styles.page, { backgroundColor: color }, animatedStyle]} />;
}

function Bench({ Bar }: { Bar: ComponentType<BarProps> }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const position = useSharedValue(0);

    useEffect(() => {
        position.set(withTiming(selectedIndex, PAGE_TIMING));
    }, [position, selectedIndex]);

    return (
        <GestureHandlerRootView style={styles.root}>
            <Page color={COLORS.canvas} index={0} position={position} />
            <Page color={COLORS.secondPage} index={1} position={position} />
            <View pointerEvents="box-none" style={styles.track}>
                <Bar onSelect={setSelectedIndex} progress={position} selectedIndex={selectedIndex} />
            </View>
        </GestureHandlerRootView>
    );
}

function BenchRoot() {
    const [Bar, setBar] = useState<ComponentType<BarProps> | null>(null);

    useEffect(() => {
        Linking.getInitialURL().then((url) => {
            const load = url?.includes("bar=reanimated") ? loadReanimatedBar : loadNativeBar;
            setBar(() => load());
            SplashScreen.hide();
        });
    }, []);

    return Bar ? <Bench Bar={Bar} /> : <View style={styles.root} />;
}

registerRootComponent(BenchRoot);

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.canvas,
    },
    page: {
        ...StyleSheet.absoluteFill,
    },
    track: {
        position: "absolute",
        bottom: 33,
        left: 20,
        width: 188,
        height: 64,
    },
    trackFace: {
        ...StyleSheet.absoluteFill,
        backgroundColor: COLORS.surface,
        borderColor: COLORS.outline,
        borderRadius: 32,
        borderWidth: 1,
    },
});
