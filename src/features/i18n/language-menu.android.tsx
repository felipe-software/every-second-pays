import {
    DropdownMenu,
    DropdownMenuItem,
    Host,
    Icon,
    RNHostView,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS, type LanguageMenuProps } from "./language-options";

const GLOBE_ICON = require("../../../assets/icons/globe.xml");
const CHECK_ICON = require("../../../assets/icons/check.xml");
const MENU_RADIUS = 24;

function UpDownChevron({ color }: { color: string }) {
    return (
        <Svg width={12} height={14} viewBox="0 0 12 14">
            <Path d="m3 5 3-3 3 3M3 9l3 3 3-3" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function LanguageMenu({ preference, disabled, onOpen, onChange }: LanguageMenuProps) {
    const [open, setOpen] = useState(false);
    const { t } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const { width } = useWindowDimensions();
    const menuWidth = Math.min(width, 430) - 44;
    const selected = LANGUAGE_OPTIONS.find((option) => option.value === preference)!;
    const openMenu = () => {
        onOpen();
        setOpen(true);
    };

    const trigger = (
        <Pressable
            testID="language-menu"
            accessible
            accessibilityRole="button"
            accessibilityState={{ disabled, expanded: open }}
            disabled={disabled}
            onPress={openMenu}
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
        </Pressable>
    );

    if (disabled) return trigger;

    return (
        <View style={{ width: menuWidth }}>
            {trigger}
            <Host
                matchContents
                colorScheme={isDark ? "dark" : "light"}
                style={{ position: "absolute", top: 0, right: 0, width: 1, height: 58 }}
            >
                <DropdownMenu
                    expanded={open}
                    onDismissRequest={() => setOpen(false)}
                    color={colors.row}
                    cornerRadius={MENU_RADIUS}
                    shadowElevation={12}
                >
                    <DropdownMenu.Trigger>
                        <RNHostView matchContents>
                            <View style={{ width: 1, height: 58 }} />
                        </RNHostView>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Items>
                        {LANGUAGE_OPTIONS.map((option) => {
                            const checked = option.value === preference;
                            return (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                        setOpen(false);
                                        onChange(option.value);
                                    }}
                                    elementColors={{
                                        textColor: checked ? colors.accentDeep : colors.ink,
                                        leadingIconColor: colors.muted,
                                        trailingIconColor: colors.accentDeep,
                                    }}
                                >
                                    <DropdownMenuItem.LeadingIcon>
                                        <Icon
                                            source={option.flag ?? GLOBE_ICON}
                                            size={option.flag ? 24 : 22}
                                            tint={option.flag ? null : colors.muted}
                                        />
                                    </DropdownMenuItem.LeadingIcon>
                                    <DropdownMenuItem.Text>
                                        <ComposeText
                                            color={checked ? colors.accentDeep : colors.ink}
                                            style={{ fontFamily: "Archivo", fontSize: 16 }}
                                        >
                                            {option.label ?? t("settings.languageSystem")}
                                        </ComposeText>
                                    </DropdownMenuItem.Text>
                                    {checked ? (
                                        <DropdownMenuItem.TrailingIcon>
                                            <Icon source={CHECK_ICON} size={18} tint={colors.accentDeep} />
                                        </DropdownMenuItem.TrailingIcon>
                                    ) : null}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenu.Items>
                </DropdownMenu>
            </Host>
        </View>
    );
}
