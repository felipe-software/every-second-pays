import { NativeTabs } from "expo-router/unstable-native-tabs";
import { router } from "expo-router";
import { DynamicColorIOS, Platform } from "react-native";

import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";

export default function AppTabs() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const requestNewSource = usePaymentComposerStore((state) => state.requestNewSource);
    const nativeLabelColor = Platform.OS === "ios"
        ? DynamicColorIOS({ light: "#3F3329", dark: "#D8CBC1" })
        : colors.muted;
    const openPaymentComposer = () => {
        requestNewSource();
        router.navigate("/");
    };

    return (
        <NativeTabs
            tintColor={colors.accent}
            iconColor={{ default: nativeLabelColor, selected: colors.accent }}
            labelStyle={{ default: { color: nativeLabelColor }, selected: { color: colors.accent } }}
            minimizeBehavior="onScrollDown"
        >
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>{t("tabs.today")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: "dollarsign.circle", selected: "dollarsign.circle.fill" }} md="paid" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Label>{t("tabs.settings")}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger
                name="add"
                role="search"
                disabled
                testID="new-source-tab"
                accessibilityLabel={t("tabs.addSource")}
                listeners={{ tabPress: openPaymentComposer }}
            >
                <NativeTabs.Trigger.Label hidden>Add</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="plus" md="add" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
