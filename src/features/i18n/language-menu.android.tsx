import { MenuView, type MenuAction } from "@expo/ui/community/menu";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Text, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS, type LanguageMenuProps } from "./language-options";
import type { LanguagePreference } from "./store";

const FLAG_EMOJI: Record<LanguagePreference, string> = {
    system: "🌐",
    en: "🇺🇸",
    pt: "🇧🇷",
    es: "🇪🇸",
    fr: "🇫🇷",
};

function UpDownChevron({ color }: { color: string }) {
    return (
        <Svg width={12} height={14} viewBox="0 0 12 14">
            <Path d="m3 5 3-3 3 3M3 9l3 3 3-3" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function LanguageMenu({ preference, disabled, onChange }: LanguageMenuProps) {
    const { t } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const { width } = useWindowDimensions();
    const menuWidth = Math.min(width, 430) - 44;
    const selected = LANGUAGE_OPTIONS.find((option) => option.value === preference)!;
    const actions: MenuAction[] = LANGUAGE_OPTIONS.map((option) => ({
        id: option.value,
        title: `${FLAG_EMOJI[option.value]}  ${option.label ?? t("settings.languageSystem")}`,
        state: option.value === preference ? "on" : "off",
        titleColor: colors.ink,
    }));
    const trigger = (
        <View
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled, expanded: false }}
            className="min-h-[58px] flex-row items-center gap-2.5 px-4"
            style={{ width: menuWidth }}
        >
            <Text className="flex-1 font-sans text-[16px] font-medium text-ink">{t("settings.language")}</Text>
            {selected.flag ? (
                <Image source={selected.flag} style={{ width: 24, height: 24 }} />
            ) : (
                <SymbolView name="globe" size={22} tintColor={colors.muted} />
            )}
            <Text className="font-sans text-[14px] text-muted">{selected.label ?? t("settings.languageSystem")}</Text>
            <UpDownChevron color={colors.muted} />
        </View>
    );

    if (disabled) return trigger;

    return (
        <MenuView
            testID="language-menu"
            actions={actions}
            colorScheme={isDark ? "dark" : "light"}
            onPressAction={({ nativeEvent }) => onChange(nativeEvent.event as LanguagePreference)}
            style={{ width: menuWidth }}
        >
            {trigger}
        </MenuView>
    );
}
