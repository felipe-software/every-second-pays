import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useEarningsTheme } from "@/features/earnings/theme";

import { useI18n } from "./i18n";
import { LANGUAGE_OPTIONS, type LanguageMenuProps } from "./language-options";

export function LanguageMenu({ preference, disabled, onChange }: LanguageMenuProps) {
    const { t } = useI18n();
    const { colors } = useEarningsTheme();
    const [open, setOpen] = useState(false);
    const selected = LANGUAGE_OPTIONS.find((option) => option.value === preference)!;
    return (
        <>
            <Pressable testID="language-menu" accessibilityRole="button" accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={() => setOpen(true)} className="min-h-[58px] flex-row items-center gap-2.5 px-4">
                <Text className="flex-1 font-sans text-[16px] font-medium text-ink">{t("settings.language")}</Text>
                {selected.flag ? <Image source={selected.flag} style={{ width: 24, height: 24 }} /> : <SymbolView name="globe" size={22} tintColor={colors.muted} />}
                <Text className="font-sans text-[14px] text-muted">{selected.label ?? t("settings.languageSystem")}</Text>
                <Text className="text-muted">⌄</Text>
            </Pressable>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable accessibilityLabel={t("common.close")} onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/20 px-8">
                    <View className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-row p-2">
                        {LANGUAGE_OPTIONS.map((option) => (
                            <Pressable key={option.value} testID={`language-${option.value}`} accessibilityRole="radio" accessibilityState={{ checked: option.value === preference }} onPress={() => { setOpen(false); onChange(option.value); }} className="min-h-12 flex-row items-center gap-3 rounded-2xl px-3">
                                {option.flag ? <Image source={option.flag} style={{ width: 24, height: 24 }} /> : <SymbolView name="globe" size={22} tintColor={colors.muted} />}
                                <Text className="flex-1 font-sans text-[16px] text-ink">{option.label ?? t("settings.languageSystem")}</Text>
                                {option.value === preference ? <Text className="text-accent-deep">✓</Text> : null}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}
