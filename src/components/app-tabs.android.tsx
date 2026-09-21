import { router } from "expo-router";
import { TabList, Tabs, TabTrigger, useTabTrigger } from "expo-router/ui";
import { useCallback, useMemo } from "react";
import { type ColorValue, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    JellyTabBarHeadless,
    type TabsIconProps,
    type TabsItem,
} from "react-native-jelly-tabs";
import Svg, { Path } from "react-native-svg";

import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import {
    AndroidTabPager,
    useAndroidTabPagerProgress,
} from "./android-tab-pager";

type TabIconProps = { color: ColorValue; size: number };

function PaidIcon({ color, size }: TabIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91 2.02.52 4.18 1.39 4.18 3.91-.01 1.83-1.38 2.83-3.12 3.16Z" />
        </Svg>
    );
}

function SettingsIcon({ color, size }: TabIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.2 7.2 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
        </Svg>
    );
}

function PaidJellyIcon({ color, size }: TabsIconProps) {
    return <PaidIcon color={color} size={size} />;
}

function SettingsJellyIcon({ color, size }: TabsIconProps) {
    return <SettingsIcon color={color} size={size} />;
}

function AndroidTabBar() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const indexTab = useTabTrigger({ name: "index" });
    const settingsTab = useTabTrigger({ name: "settings" });
    const progress = useAndroidTabPagerProgress();
    const requestNewSource = usePaymentComposerStore((state) => state.requestNewSource);
    const items = useMemo<TabsItem[]>(() => [
        {
            accessibilityLabel: t("tabs.today"),
            activeIcon: PaidJellyIcon,
            inactiveIcon: PaidJellyIcon,
            key: "index",
            label: t("tabs.today"),
            testID: "today-tab",
        },
        {
            accessibilityLabel: t("tabs.settings"),
            activeIcon: SettingsJellyIcon,
            inactiveIcon: SettingsJellyIcon,
            key: "settings",
            label: t("tabs.settings"),
            testID: "settings-tab",
        },
    ], [t]);
    const selectedIndex = indexTab.trigger?.isFocused
        ? 0
        : settingsTab.trigger?.isFocused
            ? 1
            : null;
    const selectTab = useCallback(({ index }: { index: number }) => {
        const tab = index === 1 ? settingsTab : indexTab;
        tab.switchTab(index === 1 ? "settings" : "index", {});
        return true;
    }, [indexTab, settingsTab]);
    const openPaymentComposer = () => {
        appHaptics.secondaryAction();
        requestNewSource();
        router.navigate("/");
    };

    return (
        <View pointerEvents="box-none" className="pb-2" style={styles.dock}>
            <View
                pointerEvents="box-none"
                style={[styles.dockContent, { paddingBottom: Math.max(insets.bottom, 20) }]}
            >
                <View pointerEvents="box-none" style={styles.jellyTrack}>
                    <JellyTabBarHeadless
                        colors={{
                            surface: colors.row,
                            selectedSurface: colors.accent,
                            activeContent: colors.canvas,
                            inactiveContent: colors.muted,
                        }}
                        config={{
                            layout: { iconSize: 23, itemHeight: 56, trackHeight: 64 },
                            pillJelly: { pressedScale: 1.2, frameConfig: {  } },
                            distortion: { pressedScale: 1.1 }
                        }}

                        items={items}
                        maxWidth={188}
                        onTabPress={selectTab}
                        progress={progress}
                        selectedIndex={selectedIndex}
                        touchFeedbackColor={colors.accent}
                    />
                </View>

                <View
                    style={[
                        styles.actionShell,
                        { backgroundColor: colors.row, borderColor: colors.track },
                    ]}
                >
                    <Pressable
                        testID="new-source-tab"
                        accessibilityRole="button"
                        accessibilityLabel={t("tabs.addSource")}
                        onPress={openPaymentComposer}
                        android_ripple={{ borderless: true, color: colors.active, radius: 32 }}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
                    >
                        <Svg width={28} height={28} viewBox="0 0 24 24">
                            <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" />
                        </Svg>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

export default function AppTabs() {
    const { colors } = useEarningsTheme();

    return (
        <Tabs>
            <AndroidTabPager backgroundColor={colors.canvas}>
                <AndroidTabBar />
            </AndroidTabPager>

            <TabList style={styles.hiddenTabList}>
                <TabTrigger href="/" name="index" />
                <TabTrigger href="/settings" name="settings" />
                <TabTrigger href="/add" name="add" />
                <TabTrigger href="/explore" name="explore" />
            </TabList>
        </Tabs>
    );
}

const styles = StyleSheet.create({
    dock: {
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
        alignItems: "center",
    },
    dockContent: {
        width: "100%",
        maxWidth: 430,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    jellyTrack: {
        width: 188,
        height: 64,
    },
    actionShell: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
        elevation: 1,
    },
    actionButton: {
        width: "100%",
        height: "100%",
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    actionPressed: {
        opacity: 0.72,
    },
    hiddenTabList: {
        display: "none",
    },
});
