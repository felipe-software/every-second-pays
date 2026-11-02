import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/elevated/primary-button";
import { LineIcon } from "@/components/line-icon";
import { useI18n } from "@/features/i18n/i18n";

export function WidgetAddSection({
    pinSupported,
    pinFailed,
    onAdd,
}: {
    pinSupported: boolean;
    pinFailed: boolean;
    onAdd: () => Promise<void>;
}) {
    const { t } = useI18n();

    return (
        <View className="mt-7">
            <PrimaryButton
                testID="widgets-add"
                label={t("widgets.add")}
                icon={
                    pinSupported
                        ? (color) => <LineIcon d="M12 5v14M5 12h14" color={color} size={18} strokeWidth={2.2} />
                        : undefined
                }
                disabled={!pinSupported}
                onPress={() => {
                    void onAdd();
                }}
            />
            {!pinSupported || pinFailed ? (
                <Text
                    accessibilityLiveRegion="polite"
                    className="mt-3 px-1 text-center font-sans text-[13px] leading-5 text-muted"
                >
                    {t(pinSupported ? "widgets.pinError" : "widgets.pinUnsupported")}
                </Text>
            ) : null}
        </View>
    );
}
