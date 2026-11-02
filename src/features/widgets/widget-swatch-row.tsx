import { View } from "react-native";

import { choose } from "./widget-options";
import { Swatch } from "./widget-swatch";

export function SwatchRow<T extends string>({
    label,
    appValue,
    appLabel,
    appColor,
    swatches,
    value,
    onChange,
}: {
    label: string;
    appValue: T;
    appLabel: string;
    appColor: string;
    swatches: readonly { value: T; label: string; color: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <View className="flex-row justify-between" accessibilityRole="radiogroup" accessibilityLabel={label}>
            <Swatch
                label={appLabel}
                color={appColor}
                selected={value === appValue}
                onPress={() => choose(value, appValue, onChange)}
            >
                <View className="absolute top-0 right-0 h-full w-1/2" style={{ backgroundColor: "#00000038" }} />
            </Swatch>
            {swatches.map((swatch) => (
                <Swatch
                    key={swatch.value}
                    label={swatch.label}
                    color={swatch.color}
                    selected={swatch.value === value}
                    onPress={() => choose(value, swatch.value, onChange)}
                />
            ))}
        </View>
    );
}
