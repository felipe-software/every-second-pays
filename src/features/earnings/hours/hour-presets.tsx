import { View } from "react-native";

import { Chip } from "@/components/elevated/chip";
import { Subheading } from "@/components/subheading";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { HOUR_PRESETS, type Shift, sameShifts } from "../model";

type HourPreset = (typeof HOUR_PRESETS)[number];

const PRESET_KEYS: Record<HourPreset["id"], TranslationKey> = {
    nineToFive: "payment.preset.nineToFive",
    splitDay: "payment.preset.splitDay",
    mornings: "payment.preset.mornings",
    evenings: "payment.preset.evenings",
};

export function HourPresets({ shifts, onPick }: { shifts: readonly Shift[]; onPick: (shifts: Shift[]) => void }) {
    const { t } = useI18n();
    const matching = HOUR_PRESETS.find((preset) => sameShifts(shifts, preset.shifts));

    return (
        <View className="gap-2.5">
            <Subheading className="ml-1">{t("payment.presets")}</Subheading>
            <View accessibilityRole="radiogroup" accessibilityLabel={t("payment.presets")} className="flex-row gap-2">
                {HOUR_PRESETS.map((preset) => {
                    const selected = matching?.id === preset.id;
                    return (
                        <Chip
                            key={preset.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            label={t(PRESET_KEYS[preset.id])}
                            selected={selected}
                            onPress={() => onPick(preset.shifts.map((shift) => ({ ...shift })))}
                            containerClassName="min-w-0 flex-1"
                        />
                    );
                })}
            </View>
        </View>
    );
}
