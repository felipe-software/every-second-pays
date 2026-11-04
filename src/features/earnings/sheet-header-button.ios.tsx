import { Button, Host } from "@expo/ui/swift-ui";
import {
    accessibilityIdentifier,
    accessibilityLabel,
    buttonBorderShape,
    buttonStyle,
    controlSize,
    disabled,
    font,
    foregroundStyle,
    labelStyle,
} from "@expo/ui/swift-ui/modifiers";

import { useEarningsTheme } from "./theme";

type SheetHeaderButtonProps = {
    accessibilityLabel: string;
    disabled?: boolean;
    kind: "close" | "delete";
    label?: string;
    onPress: () => void;
    testID: string;
};

export function SheetHeaderButton({
    accessibilityLabel: accessibilityText,
    disabled: isDisabled = false,
    kind,
    label,
    onPress,
    testID,
}: SheetHeaderButtonProps) {
    const { colors, isDark } = useEarningsTheme();
    const isClose = kind === "close";
    const kindModifiers = isClose
        ? [buttonBorderShape("circle"), labelStyle("iconOnly"), font({ size: 19, weight: "semibold" })]
        : [buttonBorderShape("capsule"), foregroundStyle(colors.danger)];

    return (
        <Host matchContents colorScheme={isDark ? "dark" : "light"}>
            <Button
                role={isClose ? "close" : "destructive"}
                systemImage={isClose ? "xmark" : undefined}
                label={isClose ? accessibilityText : label}
                onPress={onPress}
                modifiers={[
                    buttonStyle("glass"),
                    controlSize("large"),
                    ...kindModifiers,
                    accessibilityLabel(accessibilityText),
                    accessibilityIdentifier(testID),
                    disabled(isDisabled),
                ]}
            />
        </Host>
    );
}
