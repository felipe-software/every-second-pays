import { Image } from "expo-image";
import { Text, View } from "react-native";

import { LineIcon, UpDownChevron } from "@/components/line-icon";
import { IconTile } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS } from "./language-options";
import type { LanguagePreference } from "./store";

export const LANGUAGE_ROW_HEIGHT = 56;
export const GLOBE_PATH = "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18ZM3.5 12h17M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18";

export function LanguageTriggerContent({ preference }: { preference: LanguagePreference }) {
    const { t } = useI18n();
    const { colors } = useEarningsTheme();
    const selected = LANGUAGE_OPTIONS.find((option) => option.value === preference)!;

    return (
        <>
            <IconTile>
                <LineIcon d={GLOBE_PATH} color={colors.accentDeep} />
            </IconTile>
            <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{t("settings.language")}</Text>
            <View className="flex-row items-center gap-2">
                {selected.flag ? <Image source={selected.flag} style={{ width: 22, height: 22 }} /> : null}
                <Text className="font-sans text-[14px] text-muted">{selected.label ?? t("settings.languageSystem")}</Text>
            </View>
            <UpDownChevron color={colors.muted} />
        </>
    );
}
