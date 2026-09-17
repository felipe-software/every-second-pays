import { Host, HStack, Image, Label, Menu, Picker, Spacer, Text } from "@expo/ui/swift-ui";
import { buttonStyle, disabled, font, foregroundStyle, frame, menuOrder, onTapGesture, padding, pickerStyle, resizable, tag } from "@expo/ui/swift-ui/modifiers";
import { useAssets } from "expo-asset";

import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS, type LanguageMenuProps } from "./language-options";
import type { LanguagePreference } from "./store";

const FLAG_ASSETS = LANGUAGE_OPTIONS.flatMap((option) => option.flag ? [option.flag] : []);

export function LanguageMenu({ preference, disabled: isDisabled, onOpen, onChange }: LanguageMenuProps) {
    const { t } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const [assets] = useAssets(FLAG_ASSETS);
    const selectedIndex = LANGUAGE_OPTIONS.findIndex((option) => option.value === preference);
    const selected = LANGUAGE_OPTIONS[selectedIndex];
    const flag = (index: number) => index > 0 && assets?.[index - 1]?.localUri
        ? <Image uiImage={assets[index - 1].localUri!} modifiers={[resizable(), frame({ width: 24, height: 24 })]} />
        : <Image systemName="globe" size={22} color={colors.muted} />;

    return (
        <Host style={{ height: 58 }} colorScheme={isDark ? "dark" : "light"} ignoreSafeArea="all">
            <Menu
                testID="language-menu"
                modifiers={[
                    buttonStyle("plain"),
                    menuOrder("fixed"),
                    disabled(isDisabled),
                    onTapGesture(() => {
                        if (!isDisabled) onOpen();
                    }),
                ]}
                label={
                    <HStack spacing={10} modifiers={[padding({ horizontal: 16 }), frame({ minHeight: 58, maxWidth: Infinity })]}>
                        <Text modifiers={[font({ size: 16, weight: "medium" }), foregroundStyle(colors.ink)]}>{t("settings.language")}</Text>
                        <Spacer />
                        {flag(selectedIndex)}
                        <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>{selected.label ?? t("settings.languageSystem")}</Text>
                        <Image systemName="chevron.up.chevron.down" size={11} color={colors.muted} />
                    </HStack>
                }
            >
                <Picker<LanguagePreference>
                    label={t("settings.language")}
                    selection={preference}
                    onSelectionChange={onChange}
                    modifiers={[pickerStyle("inline")]}
                >
                    {LANGUAGE_OPTIONS.map((option, index) => (
                        <Label
                            key={option.value}
                            testID={`language-${option.value}`}
                            title={option.label ?? t("settings.languageSystem")}
                            icon={flag(index)}
                            modifiers={[tag(option.value)]}
                        />
                    ))}
                </Picker>
            </Menu>
        </Host>
    );
}
