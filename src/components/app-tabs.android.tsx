import { router } from "expo-router";
import { TabList, Tabs, TabTrigger, useTabTrigger } from "expo-router/ui";
import { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { RaisedPressable } from "@/components/elevated/raised";
import { JellyTabBar, type JellyTabContentStyle, type JellyTabItem } from "@/components/jelly-tabs";
import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { AndroidTabPager, useAndroidTabPagerProgress, useIsTabSubpage } from "./android-tab-pager";

const DOCK_HIDE_OFFSET = 24;
const DOCK_TIMING = { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
const PAID_ICON_PATH =
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91 2.02.52 4.18 1.39 4.18 3.91-.01 1.83-1.38 2.83-3.12 3.16Z";
const SETTINGS_ICON_PATH =
    "M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.2 7.2 0 0 0-1.69-.98L14.5 2.42A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.08.66-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.08.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z";

const PAID_OUTLINE_ICON_PATH =
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z";
const SETTINGS_OUTLINE_ICON_PATH =
    "M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z";
const TAB_CONTENT_STYLE: JellyTabContentStyle = {
    iconSize: 28,
    iconLabelGap: 1,
    labelFontSize: 11,
    pillOverhang: 8,
    activeLabelFontFamily: "Archivo-SemiBold",
    inactiveLabelFontFamily: "Archivo-Medium",
};

function getSelectedTabIndex(indexFocused?: boolean, settingsFocused?: boolean) {
    if (indexFocused) return 0;
    return settingsFocused ? 1 : null;
}

function AndroidTabBar() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const indexTab = useTabTrigger({ name: "index" });
    const settingsTab = useTabTrigger({ name: "settings" });
    const progress = useAndroidTabPagerProgress();
    const onSubpage = useIsTabSubpage();
    const hidden = useSharedValue(onSubpage ? 1 : 0);
    const dockStyle = useAnimatedStyle(() => ({
        opacity: 1 - hidden.get(),
        transform: [{ translateY: hidden.get() * DOCK_HIDE_OFFSET }],
    }));

    useEffect(() => {
        hidden.set(withTiming(onSubpage ? 1 : 0, DOCK_TIMING));
    }, [hidden, onSubpage]);
    const requestNewSource = usePaymentComposerStore((state) => state.requestNewSource);
    const items = useMemo<JellyTabItem[]>(
        () => [
            {
                accessibilityLabel: t("tabs.earnings"),
                iconPath: PAID_ICON_PATH,
                inactiveIconPath: PAID_OUTLINE_ICON_PATH,
                key: "index",
                label: t("tabs.earnings"),
                testID: "today-tab",
            },
            {
                accessibilityLabel: t("tabs.settings"),
                iconPath: SETTINGS_ICON_PATH,
                inactiveIconPath: SETTINGS_OUTLINE_ICON_PATH,
                key: "settings",
                label: t("tabs.settings"),
                testID: "settings-tab",
            },
        ],
        [t],
    );
    const selectedIndex = getSelectedTabIndex(indexTab.trigger?.isFocused, settingsTab.trigger?.isFocused);
    const selectTab = useCallback(
        (index: number) => {
            const tab = index === 1 ? settingsTab : indexTab;
            tab.switchTab(index === 1 ? "settings" : "index", {});
        },
        [indexTab, settingsTab],
    );
    const openPaymentComposer = () => {
        appHaptics.secondaryAction();
        requestNewSource();
        router.navigate("/");
    };

    return (
        <Animated.View
            pointerEvents={onSubpage ? "none" : "box-none"}
            accessibilityElementsHidden={onSubpage}
            importantForAccessibility={onSubpage ? "no-hide-descendants" : "auto"}
            className="pb-2"
            style={[styles.dock, dockStyle]}
        >
            <View pointerEvents="box-none" style={[styles.dockContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View pointerEvents="box-none" style={styles.jellyTrack}>
                    <JellyTabBar
                        colors={{
                            accent: colors.accent,
                            activeContent: colors.onAccent,
                            inactiveContent: colors.muted,
                            outline: colors.cardOutline,
                            surface: colors.cardFace,
                        }}
                        contentStyle={TAB_CONTENT_STYLE}
                        items={items}
                        onTabPress={selectTab}
                        progress={progress}
                        selectedIndex={selectedIndex}
                    />
                </View>

                <RaisedPressable
                    testID="new-source-tab"
                    accessibilityRole="button"
                    accessibilityLabel={t("tabs.addSource")}
                    onPress={openPaymentComposer}
                    surface="card"
                    depth={4}
                    radius={32}
                    style={styles.actionButton}
                >
                    <Svg width={28} height={28} viewBox="0 0 24 24">
                        <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" />
                    </Svg>
                </RaisedPressable>
            </View>
        </Animated.View>
    );
}

export default function AppTabs() {
    return (
        <Tabs>
            <AndroidTabPager>
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    jellyTrack: {
        width: 188,
        height: 64,
    },
    actionButton: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
    },
    hiddenTabList: {
        display: "none",
    },
});
