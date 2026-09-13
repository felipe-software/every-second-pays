import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PALETTES, type Appearance, type ThemeMode } from "@/features/appearance/palettes";
import { useAppearanceStore } from "@/features/appearance/store";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsTheme } from "@/features/earnings/theme";

const MODES: { id: ThemeMode; label: string; detail: string }[] = [
    { id: "system", label: "Device", detail: "Follow your device appearance" },
    { id: "light", label: "Light", detail: "A bright, soft canvas" },
    { id: "dark", label: "Dark", detail: "Easy on the eyes after hours" },
];

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const { appearance, saving, loading, loadError, update, load } = useAppearanceStore();
    const [saveError, setSaveError] = useState(false);
    const disabled = saving || loading || loadError;
    const change = async (value: Partial<Appearance>) => {
        setSaveError(false);
        try { await update(value); } catch { setSaveError(true); }
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground />
                <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 22 }}>
                    <Pressable testID="close-settings" accessibilityRole="button" accessibilityLabel="Back to earnings"
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                        className="min-h-11 flex-row items-center self-start gap-2 rounded-full bg-row px-4 active:opacity-70">
                        <Text className="font-sans text-[20px] text-ink">‹</Text>
                        <Text className="font-sans text-[14px] font-semibold text-ink">Back</Text>
                    </Pressable>
                    <Text accessibilityRole="header" className="mt-7 font-sans text-[34px] font-bold tracking-[-1px] text-ink">Make it yours.</Text>
                    <Text className="mt-2 font-sans text-[14px] leading-5 text-muted">Your colors. Your everyday counter.</Text>
                    <Text accessibilityRole="header" className="mt-8 mb-3 font-sans text-[17px] font-semibold text-ink">Appearance</Text>
                    <View className="gap-2">
                        {MODES.map((mode) => {
                            const selected = appearance.mode === mode.id;
                            return (
                                <Pressable key={mode.id} testID={`theme-${mode.id}`} accessibilityRole="radio" accessibilityLabel={mode.label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => void change({ mode: mode.id })}
                                    className={`min-h-[68px] flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-70 ${selected ? "bg-active border-accent" : "bg-row border-transparent"}`}>
                                    <View className="flex-1 gap-1">
                                        <Text className="font-sans text-[16px] font-semibold text-ink">{mode.label}</Text>
                                        <Text className="font-sans text-[12px] text-muted">{mode.detail}</Text>
                                    </View>
                                    <Text style={{ color: selected ? colors.accentDeep : colors.muted, fontSize: 20 }}>{selected ? "●" : "○"}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text accessibilityRole="header" className="mt-7 mb-3 font-sans text-[17px] font-semibold text-ink">Color palette</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {PALETTES.map((palette) => {
                            const selected = appearance.palette === palette.id;
                            return (
                                <Pressable key={palette.id} testID={`palette-${palette.id}`} accessibilityRole="radio" accessibilityLabel={palette.name} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => void change({ palette: palette.id })}
                                    className={`min-h-[54px] flex-row items-center gap-2 rounded-2xl border px-3 py-3 active:opacity-70 ${selected ? "bg-active border-accent" : "bg-row border-transparent"}`}>
                                    <View style={{ backgroundColor: palette.accent, width: 24, height: 24, borderRadius: 12 }} />
                                    <Text className="font-sans text-[14px] font-medium text-ink">{palette.name}{selected ? " ✓" : ""}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text accessibilityLiveRegion="polite" className="mt-5 font-sans text-[12px] leading-5 text-muted">
                        {loadError ? "Could not load your preferences." : saveError ? "Could not save. Please select your choice again." : saving ? "Saving…" : "Saved automatically on this device."}
                    </Text>
                    {loadError ? <Pressable accessibilityRole="button" onPress={() => void load()} className="min-h-11 justify-center"><Text className="font-sans font-semibold text-accent-deep">Try again</Text></Pressable> : null}
                </ScrollView>
            </View>
        </View>
    );
}
