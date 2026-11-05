import { Text } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { detectedLowEnd } from "@/features/device/low-end";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { useDeveloperStore } from "./store";

function labelKey(forced: boolean) {
    if (forced) return "settings.lowEndForced";
    return detectedLowEnd ? "settings.lowEndDetected" : "settings.lowEndOff";
}

export function LowEndToggle() {
    const { t } = useI18n();
    const { colors } = useEarningsTheme();
    const forced = useDeveloperStore((state) => state.forceLowEnd);
    const toggle = useDeveloperStore((state) => state.toggleForceLowEnd);

    return (
        <RaisedPressable
            testID="force-low-end"
            accessibilityRole="switch"
            accessibilityState={{ checked: forced || detectedLowEnd }}
            onPress={() => {
                appHaptics.secondaryAction();
                toggle();
            }}
            surface={forced ? "accent" : "canvas"}
            depth={4}
            radius={15}
            className="min-h-[52px] items-center justify-center px-4"
        >
            <Text
                className={`text-center font-sans text-[14px] font-semibold ${forced ? "" : "text-ink"}`}
                style={forced ? colors.onAccentText : undefined}
            >
                {t(labelKey(forced))}
            </Text>
        </RaisedPressable>
    );
}
