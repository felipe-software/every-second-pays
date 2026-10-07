import { router } from "expo-router";
import { Platform, Text, View } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { ForwardChevron, WidgetsIcon } from "./widget-glyphs";
import { useWidgetStore } from "./widget-store";

/** Settings' entry into the Widgets page. Live widgets are Android 12+ only. */
export function WidgetsSettingsRow() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const supported = useWidgetStore((state) => state.supported);
    const count = useWidgetStore((state) => state.widgets.length);

    if (Platform.OS !== "android" || supported === false) return null;

    return (
        <View>
            <Text className="mt-8 mb-3 ml-1 font-sans text-[13px] font-semibold text-muted">{t("settings.widgets")}</Text>
            <RaisedPressable
                testID="settings-widgets"
                accessibilityRole="button"
                accessibilityHint={t("settings.widgetsRowHint")}
                onPress={() => {
                    appHaptics.secondaryAction();
                    router.push("/settings/widgets");
                }}
                surface="row"
                depth={3}
                radius={18}
                className="min-h-[68px] flex-row items-center gap-3.5 px-4 py-3"
            >
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-active">
                    <WidgetsIcon accent={colors.accent} ink={colors.ink} />
                </View>
                <View className="min-w-0 flex-1">
                    <Text className="font-sans text-[16px] font-semibold tracking-[-0.2px] text-ink">{t("settings.widgetsRow")}</Text>
                    <Text numberOfLines={2} className="mt-0.5 font-sans text-[12.5px] leading-[17px] text-muted">
                        {count ? t("settings.widgetsCount", { count }) : t("settings.widgetsRowHint")}
                    </Text>
                </View>
                <ForwardChevron color={colors.ink} />
            </RaisedPressable>
        </View>
    );
}
