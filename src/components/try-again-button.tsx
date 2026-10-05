import { Text } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { useI18n } from "@/features/i18n/i18n";

/** The small raised "Try again" button shown under a load error. */
export function TryAgainButton({ onPress, className }: { onPress: () => void; className?: string }) {
    const { t } = useI18n();

    return (
        <RaisedPressable
            accessibilityRole="button"
            onPress={onPress}
            hitSlop={6}
            containerClassName={`self-start ${className ?? ""}`}
            surface="row"
            depth={2}
            radius={10}
            className="h-9 justify-center px-3.5"
        >
            <Text className="font-sans text-[14px] font-semibold text-accent-deep">{t("common.tryAgain")}</Text>
        </RaisedPressable>
    );
}
