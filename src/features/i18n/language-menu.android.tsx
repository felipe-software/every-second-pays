import {
    DropdownMenu,
    DropdownMenuItem,
    Host,
    Icon,
    RNHostView,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { RAISED_OUTLINE } from "@/components/elevated/raised";
import { rippleConfig } from "@/components/elevated/ripple";
import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS, type LanguageMenuProps } from "./language-options";
import { LANGUAGE_ROW_HEIGHT, LanguageTriggerContent } from "./language-trigger";

const GLOBE_ICON = require("../../assets/icons/globe.xml");
const CHECK_ICON = require("../../assets/icons/check.xml");
const MENU_RADIUS = 24;

export function LanguageMenu({ preference, disabled, onOpen, onPressIn, onPressOut, onChange }: LanguageMenuProps) {
    const [open, setOpen] = useState(false);
    const { t } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const { width } = useWindowDimensions();
    const menuWidth = Math.min(width, 430) - 44 - 2 * RAISED_OUTLINE;
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
            accessibilityLabel={`${t("settings.language")}, ${selected.label ?? t("settings.languageSystem")}`}
            accessibilityState={{ disabled, expanded: open }}
            disabled={disabled}
            onPress={openMenu}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            android_ripple={rippleConfig(colors.ink)}
            className="flex-row items-center gap-3 px-4"
            style={{ width: menuWidth, minHeight: LANGUAGE_ROW_HEIGHT }}
        >
            <LanguageTriggerContent preference={preference} />
        </Pressable>
    );

    if (disabled) return trigger;

    return (
        <View style={{ width: menuWidth }}>
            {trigger}
            <Host
                matchContents
                colorScheme={isDark ? "dark" : "light"}
                style={{ position: "absolute", top: 0, right: 0, width: 1, height: LANGUAGE_ROW_HEIGHT }}
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
                            <View style={{ width: 1, height: LANGUAGE_ROW_HEIGHT }} />
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
