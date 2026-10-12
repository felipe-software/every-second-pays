import { router } from "expo-router";
import { Platform, Text } from "react-native";
import { Rect } from "react-native-svg";

import { LineIcon } from "@/components/line-icon";
import { IconTile, SettingsRow } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { ForwardChevron } from "./widget-glyphs";
import { useWidgetStore } from "./widget-store";

export function useWidgetsRowVisible() {
    const supported = useWidgetStore((state) => state.supported);
    return Platform.OS === "android" && supported !== false;
}

function WidgetsIcon({ color }: { color: string }) {
    return (
        <LineIcon color={color}>
            <Rect x={3.5} y={3.5} width={17} height={7} rx={2.5} />
            <Rect x={3.5} y={13.5} width={7} height={7} rx={2.5} />
            <Rect x={13.5} y={13.5} width={7} height={7} rx={2.5} />
        </LineIcon>
    );
}

export function WidgetsSettingsRow() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <SettingsRow
            testID="settings-widgets"
            accessibilityRole="button"
            accessibilityHint={t("settings.widgetsRowHint")}
            onPress={() => {
                appHaptics.secondaryAction();
                router.push("/settings/widgets");
            }}
        >
            <IconTile>
                <WidgetsIcon color={colors.accentDeep} />
            </IconTile>
            <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{t("settings.widgetsRow")}</Text>
            <ForwardChevron color={colors.ink} />
        </SettingsRow>
    );
}
