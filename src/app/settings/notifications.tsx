import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Noti } from "react-native-noti";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RaisedPressable } from "@/components/elevated/raised";
import { LargeTitleScrollView } from "@/components/large-title-scroll-view";
import { Card, SectionLabel } from "@/components/settings-card";
import { useDeveloperMenuVisible } from "@/features/developer/store";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { DevNotificationControls } from "@/features/notifications/dev-notification-controls";
import { activePause, type PauseChoice, type ProgressLevel, type WeekLevel } from "@/features/notifications/routine";
import { useNotificationStore } from "@/features/notifications/store";
import { BackChevron } from "@/features/widgets/widget-glyphs";
import { OptionChips, OptionGroup, SwitchRow } from "@/features/widgets/widget-options";

const WEEK_LEVELS: readonly WeekLevel[] = ["every", "other", "off"];
const PROGRESS_LEVELS: readonly ProgressLevel[] = ["all", "half", "final", "off"];
const PAUSE_CHOICES: readonly PauseChoice[] = ["none", "week", "twoWeeks", "forever"];

function BackButton({ label, color }: { label: string; color: string }) {
    return (
        <RaisedPressable
            testID="notifications-back"
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.back()}
            hitSlop={8}
            surface="card"
            depth={3}
            radius={20}
            className="h-10 w-10 items-center justify-center"
        >
            <BackChevron color={color} />
        </RaisedPressable>
    );
}

function BlockedBanner() {
    const { t } = useI18n();
    return (
        <Pressable
            testID="notifications-blocked"
            accessibilityRole="button"
            onPress={() => {
                appHaptics.secondaryAction();
                void Noti.bills.openSettings();
            }}
            className="mt-4 rounded-[20px] bg-active px-4 py-3.5"
        >
            <Text className="font-sans text-[15px] font-semibold text-ink">{t("notifications.blocked")}</Text>
            <Text className="mt-1 font-sans text-[13.5px] font-semibold text-accent-deep">{t("notifications.blockedAction")}</Text>
        </Pressable>
    );
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const settings = useNotificationStore((state) => state.settings);
    const change = useNotificationStore((state) => state.change);
    const pause = useNotificationStore((state) => state.pause);
    const developer = useDeveloperMenuVisible();
    const [blocked, setBlocked] = useState(false);
    const [now] = useState(() => Date.now());

    useEffect(() => {
        void useNotificationStore.getState().load();
    }, []);

    useFocusEffect(useCallback(() => {
        void Noti.bills.areEnabled().then((enabled) => setBlocked(!enabled)).catch(() => {});
    }, []));

    const weekLabels: Record<WeekLevel, string> = {
        every: t("notifications.week.every"),
        other: t("notifications.week.other"),
        off: t("notifications.off"),
    };
    const progressLabels: Record<ProgressLevel, string> = {
        all: t("notifications.progress.all"),
        half: t("notifications.progress.half"),
        final: t("notifications.progress.final"),
        off: t("notifications.off"),
    };
    const pauseLabels: Record<PauseChoice, string> = {
        none: t("notifications.pause.none"),
        week: t("notifications.pause.week"),
        twoWeeks: t("notifications.pause.twoWeeks"),
        forever: t("notifications.pause.forever"),
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <LargeTitleScrollView
                    background={<EarningsBackground />}
                    testID="notifications-screen"
                    title={t("notifications.title")}
                    headerLeft={<BackButton label={t("notifications.back")} color={colors.ink} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                >
                    {blocked ? <BlockedBanner /> : null}

                    <SectionLabel>{t("notifications.section.earnings")}</SectionLabel>
                    <Card className="overflow-hidden">
                        <OptionGroup label={t("notifications.week")} divider={false}>
                            <OptionChips
                                testID="notifications-week"
                                label={t("notifications.week")}
                                options={WEEK_LEVELS.map((value) => ({ value, label: weekLabels[value] }))}
                                value={settings.week}
                                onChange={(week) => change({ week })}
                            />
                        </OptionGroup>
                        <OptionGroup label={t("notifications.progress")}>
                            <OptionChips
                                testID="notifications-progress"
                                label={t("notifications.progress")}
                                options={PROGRESS_LEVELS.map((value) => ({ value, label: progressLabels[value] }))}
                                value={settings.progress}
                                onChange={(progress) => change({ progress })}
                            />
                        </OptionGroup>
                        <SwitchRow
                            testID="notifications-year"
                            label={t("notifications.year")}
                            value={settings.year}
                            onChange={(year) => change({ year })}
                        />
                    </Card>

                    <SectionLabel>{t("notifications.section.reminders")}</SectionLabel>
                    <Card className="overflow-hidden">
                        <SwitchRow
                            testID="notifications-meter"
                            label={t("notifications.meter")}
                            value={settings.meter}
                            onChange={(meter) => change({ meter })}
                            divider={false}
                        />
                    </Card>

                    <SectionLabel>{t("notifications.section.privacy")}</SectionLabel>
                    <Card className="overflow-hidden">
                        <SwitchRow
                            testID="notifications-amounts"
                            label={t("notifications.showAmounts")}
                            value={settings.showAmounts}
                            onChange={(showAmounts) => change({ showAmounts })}
                            divider={false}
                        />
                        <OptionGroup label={t("notifications.pause")}>
                            <OptionChips
                                testID="notifications-pause"
                                label={t("notifications.pause")}
                                options={PAUSE_CHOICES.map((value) => ({ value, label: pauseLabels[value] }))}
                                value={activePause(settings, now)}
                                onChange={pause}
                            />
                        </OptionGroup>
                    </Card>

                    {developer ? <DevNotificationControls /> : null}
                </LargeTitleScrollView>
            </View>
        </View>
    );
}
