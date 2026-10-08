import { Pressable, Text, View } from "react-native";

import { CheckIcon } from "@/components/check-icon";
import { PopIn } from "@/components/elevated/pop-in";
import { Raised, usePressSink } from "@/components/elevated/raised";
import { edgeColor } from "@/features/earnings/theme";
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

function Swatch({
    palette,
    label,
    selected,
    disabled,
    onPress,
}: {
    palette: (typeof PALETTES)[number];
    label: string;
    selected: boolean;
    disabled: boolean;
    onPress: (origin: ThemeTransitionOrigin) => void;
}) {
    const sink = usePressSink();

    return (
        <Pressable
            testID={`palette-${palette.id}`}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={(event) => onPress({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })}
            onPressIn={sink.onPressIn}
            onPressOut={sink.onPressOut}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ borderColor: selected ? palette.accent : "transparent", borderWidth: 2 }}
        >
            <Raised
                surface={{ face: palette.accent, edge: edgeColor(palette.accent, { accent: true }) }}
                depth={3}
                radius={18}
                selected={selected}
                pressed={sink.pressed}
                className="h-9 w-9 items-center justify-center"
            >
                <PopIn visible={selected}>
                    <CheckIcon size={18} color="#FFFFFF" />
                </PopIn>
            </Raised>
        </Pressable>
    );
}

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
                {PALETTES.map((palette) => (
                    <Swatch
                        key={palette.id}
                        palette={palette}
                        label={t(PALETTE_KEYS[palette.id])}
                        selected={appearance.palette === palette.id}
                        disabled={disabled}
                        onPress={(origin) => onChange(palette.id, origin)}
                    />
                ))}
            </View>
        </View>
    );
}
