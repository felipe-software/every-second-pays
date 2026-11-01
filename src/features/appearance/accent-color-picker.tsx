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
            className="h-[46px] w-[46px] items-center justify-center rounded-full"
            style={{ borderColor: selected ? palette.accent : "transparent", borderWidth: 2 }}
        >
            <Raised
                surface={{ face: palette.accent, edge: edgeColor(palette.accent, { accent: true }) }}
                depth={3}
                radius={17}
                selected={selected}
                // No ripple: redrawing it during the theme render delays the reveal by about 250 ms on low-end Android.
                pressed={sink.pressed}
                className="h-[34px] w-[34px] items-center justify-center"
            >
                <PopIn visible={selected}>
                    <CheckIcon size={16} color="#FFFFFF" />
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
        <View className="px-4 py-3.5">
            <Text className="mb-2.5 font-sans text-[15.5px] font-medium text-ink">{t("settings.accentColor")}</Text>
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
