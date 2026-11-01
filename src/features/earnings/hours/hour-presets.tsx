import { Text, View } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { Subheading } from "@/components/subheading";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { HOUR_PRESETS, type Shift, sameShifts } from "../model";
import { useEarningsTheme } from "../theme";

type HourPreset = (typeof HOUR_PRESETS)[number];

const PRESET_KEYS: Record<HourPreset["id"], TranslationKey> = {
    nineToFive: "payment.preset.nineToFive",
    splitDay: "payment.preset.splitDay",
    mornings: "payment.preset.mornings",
    evenings: "payment.preset.evenings",
};

export function HourPresets({ shifts, onPick }: { shifts: readonly Shift[]; onPick: (shifts: Shift[]) => void }) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const matching = HOUR_PRESETS.find((preset) => sameShifts(shifts, preset.shifts));

    return (
        <View className="gap-2.5">
            <Subheading className="ml-1">{t("payment.presets")}</Subheading>
            <View accessibilityRole="radiogroup" accessibilityLabel={t("payment.presets")} className="flex-row gap-2">
                {HOUR_PRESETS.map((preset) => {
                    const selected = matching?.id === preset.id;
                    return (
                        <RaisedPressable
                            key={preset.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                                appHaptics.selection();
                                onPick(preset.shifts.map((shift) => ({ ...shift })));
                            }}
                            containerClassName="min-w-0 flex-1"
                            surface={selected ? "active" : "card"}
                            depth={3}
                            radius={13}
                            selected={selected}
                            className="h-[42px] items-center justify-center px-1"
                        >
                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                className="font-sans text-[13.5px] font-semibold"
                                style={{ color: selected ? colors.accentDeep : colors.muted }}
                            >
                                {t(PRESET_KEYS[preset.id])}
                            </Text>
                        </RaisedPressable>
                    );
                })}
            </View>
        </View>
    );
}
