import { router } from "expo-router";
import { Platform, Text } from "react-native";
import { Noti } from "react-native-noti";

import { LineIcon } from "@/components/line-icon";
import { IconTile, SettingsRow } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { ForwardChevron } from "@/features/widgets/widget-glyphs";

export const notificationsRowVisible = Platform.OS === "android" && Noti.bills.isSupported();

const BELL = "M6 16.5h12l-1.4-2.2V10a4.6 4.6 0 0 0-9.2 0v4.3L6 16.5ZM10.2 19.5a2 2 0 0 0 3.6 0";

export function NotificationsSettingsRow() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <SettingsRow
            testID="settings-notifications"
            accessibilityRole="button"
            accessibilityHint={t("settings.notificationsRowHint")}
            onPress={() => {
                appHaptics.secondaryAction();
                router.push("/settings/notifications");
            }}
        >
            <IconTile>
                <LineIcon d={BELL} color={colors.accentDeep} />
            </IconTile>
            <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{t("settings.notificationsRow")}</Text>
            <ForwardChevron color={colors.ink} />
        </SettingsRow>
    );
}
