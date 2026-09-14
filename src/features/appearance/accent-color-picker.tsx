import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { PALETTES, type Appearance, type PaletteId } from "./palettes";
import type { ThemeTransitionOrigin } from "./theme-transition";

const PALETTE_KEYS: Record<PaletteId, TranslationKey> = {
    orange: "palette.orange",
    green: "palette.green",
    blue: "palette.blue",
    rose: "palette.rose",
    lavender: "palette.lavender",
};

export function AccentColorPicker({
    appearance,
    disabled,
    onChange,
}: {
    appearance: Appearance;
    disabled: boolean;
    onChange: (palette: PaletteId, origin: ThemeTransitionOrigin) => void;
}) {
    const { t } = useI18n();
    return (
        <View className="rounded-[20px] bg-row px-4 pt-4 pb-[18px]">
            <View className="mb-4 flex-row items-center justify-between">
                <Text className="font-sans text-[16px] font-semibold tracking-[-0.2px] text-ink">{t("settings.color")}</Text>
                <Text className="font-sans text-[13px] font-medium text-muted">{t(PALETTE_KEYS[appearance.palette])}</Text>
            </View>
            <View className="flex-row justify-between" accessibilityRole="radiogroup">
                {PALETTES.map((palette) => {
                    const selected = appearance.palette === palette.id;
                    const label = t(PALETTE_KEYS[palette.id]);
                    return (
                        <Pressable
                            key={palette.id}
                            testID={`palette-${palette.id}`}
                            accessibilityRole="radio"
                            accessibilityLabel={label}
                            accessibilityState={{ checked: selected, disabled }}
                            disabled={disabled}
                            onPress={(event) => onChange(
                                palette.id,
                                { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY },
                            )}
                            className="h-12 w-12 items-center justify-center rounded-full active:opacity-60"
                            style={{
                                borderColor: selected ? palette.accent : "transparent",
                                borderWidth: 2,
                            }}
                        >
                            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.accent }}>
                                {selected ? <Text className="font-sans text-[17px] font-bold text-white">✓</Text> : null}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
