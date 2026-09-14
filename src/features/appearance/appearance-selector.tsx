import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { getThemeColors, type Appearance, type ThemeMode } from "./palettes";

const MODES: ThemeMode[] = ["system", "light", "dark"];
const MODE_KEYS: Record<ThemeMode, TranslationKey> = {
    system: "settings.mode.system",
    light: "settings.mode.light",
    dark: "settings.mode.dark",
};

function AppearancePreview({
    mode,
    active,
    palette,
    disabled,
    onPress,
}: {
    mode: ThemeMode;
    active: boolean;
    palette: Appearance["palette"];
    disabled: boolean;
    onPress: () => void;
}) {
    const { t, formatMoney } = useI18n();
    const label = t(MODE_KEYS[mode]);
    const light = getThemeColors(palette, false);
    const dark = getThemeColors(palette, true);
    const preview = mode === "dark" ? dark : light;
    const followsDevice = mode === "system";

    return (
        <Pressable
            testID={`theme-${mode}`}
            accessibilityRole="radio"
            accessibilityLabel={t("settings.modeAccessibility", { mode: label })}
            accessibilityState={{ checked: active, disabled }}
            disabled={disabled}
            onPress={onPress}
            className="min-w-0 flex-1 items-center active:opacity-70"
        >
            <View
                className="h-[116px] w-full overflow-hidden rounded-[16px] border-[3px] p-2"
                style={{
                    backgroundColor: preview.canvas,
                    borderColor: active ? preview.accent : preview.soft,
                }}
            >
                {followsDevice ? (
                    <View
                        pointerEvents="none"
                        className="absolute -right-5 -top-8 h-[180px] w-[72%] rotate-[16deg]"
                        style={{ backgroundColor: dark.canvas }}
                    />
                ) : null}
                <View
                    className="mb-2.5 h-1 w-6 self-center rounded-full"
                    style={{ backgroundColor: followsDevice ? preview.accent : preview.track }}
                />
                <View className="items-center">
                    <Text
                        className="font-sans text-[6px] font-medium"
                        style={{ color: followsDevice ? preview.accent : preview.muted }}
                    >
                        {t("settings.previewToday")}
                    </Text>
                    <Text
                        className="mt-0.5 font-sans text-[15px] font-bold tracking-[-0.8px]"
                        style={{ color: followsDevice ? preview.accent : preview.ink }}
                    >
                        ${formatMoney(124.8)}
                    </Text>
                </View>
                <View className="mt-2.5 gap-1">
                    <View
                        className="h-[17px] rounded-[6px]"
                        style={{ backgroundColor: followsDevice ? preview.accent : preview.row, opacity: followsDevice ? 0.28 : 1 }}
                    />
                    <View
                        className="h-[17px] rounded-[6px]"
                        style={{ backgroundColor: followsDevice ? preview.accent : preview.active, opacity: followsDevice ? 0.5 : 1 }}
                    />
                </View>
                <View
                    className="absolute bottom-2 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: preview.accent }}
                />
            </View>

            <View className="mt-2.5 flex-row items-center gap-1.5">
                <View
                    className="h-4 w-4 items-center justify-center rounded-full border"
                    style={{
                        backgroundColor: active ? preview.accent : "transparent",
                        borderColor: active ? preview.accent : preview.track,
                    }}
                >
                    {active ? <Text className="font-sans text-[10px] font-bold text-white">✓</Text> : null}
                </View>
                <Text className="font-sans text-[13px] font-semibold text-ink">{label}</Text>
            </View>
        </Pressable>
    );
}

export function AppearanceSelector({
    appearance,
    disabled,
    onChange,
}: {
    appearance: Appearance;
    disabled: boolean;
    onChange: (mode: ThemeMode) => void;
}) {
    return (
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
            {MODES.map((mode) => (
                <AppearancePreview
                    key={mode}
                    mode={mode}
                    active={appearance.mode === mode}
                    palette={appearance.palette}
                    disabled={disabled}
                    onPress={() => onChange(mode)}
                />
            ))}
        </View>
    );
}
