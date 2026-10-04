import { Text, View } from "react-native";

import { ElevatedPressable } from "@/components/elevated/elevated-pressable";
import { mixColors } from "@/features/appearance/color";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { HOUR_PRESETS, type Shift, sameShifts } from "../model";
import { edgeColor, useEarningsTheme, useSheetCard, useSheetFill } from "../theme";

type HourPreset = (typeof HOUR_PRESETS)[number];

const PRESET_KEYS: Record<HourPreset["id"], TranslationKey> = {
    nineToFive: "payment.preset.nineToFive",
    splitDay: "payment.preset.splitDay",
    mornings: "payment.preset.mornings",
    evenings: "payment.preset.evenings",
};

/** A titled, segmented row of common schedules; the matching one is raised. */
export function HourPresets({ shifts, onPick }: { shifts: readonly Shift[]; onPick: (shifts: Shift[]) => void }) {
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const fill = useSheetFill();
    const card = useSheetCard();
    // The raised segment is the bright card color in light mode and a lifted fill in dark mode.
    const raised = isDark ? mixColors(fill, colors.ink, 0.12) : card;
    const matching = HOUR_PRESETS.find((preset) => sameShifts(shifts, preset.shifts));

    return (
        <View className="gap-1.5 rounded-[18px] px-1 pt-2.5 pb-1" style={{ backgroundColor: fill }}>
            <Text accessibilityRole="header" className="px-2.5 font-sans text-[13px] font-semibold text-muted">
                {t("payment.presets")}
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={t("payment.presets")} className="flex-row gap-1">
                {HOUR_PRESETS.map((preset) => {
                    const selected = matching?.id === preset.id;
                    return (
                        <ElevatedPressable
                            key={preset.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                                appHaptics.selection();
                                onPick(preset.shifts.map((shift) => ({ ...shift })));
                            }}
                            containerClassName="min-w-0 flex-1"
                            face={selected ? raised : fill}
                            edge={selected ? edgeColor(raised, { isDark }) : fill}
                            depth={2}
                            radius={13}
                            selected={selected}
                            className="h-[42px] items-center justify-center px-1"
                        >
                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                className="font-sans text-[13.5px] font-semibold"
                                style={{ color: selected ? colors.ink : colors.muted }}
                            >
                                {t(PRESET_KEYS[preset.id])}
                            </Text>
                        </ElevatedPressable>
                    );
                })}
            </View>
        </View>
    );
}
