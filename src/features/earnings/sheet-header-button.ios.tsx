import { GlassView } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";

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
    disabled = false,
    kind,
    label,
    onPress,
    testID,
}: SheetHeaderButtonProps) {
    const { colors, isDark } = useEarningsTheme();
    const isClose = kind === "close";

    return (
        <GlassView
            glassEffectStyle="clear"
            isInteractive
            style={[styles.glass, isClose ? styles.closeGlass : styles.deleteGlass]}
            tintColor={isClose ? undefined : `${colors.danger}26`}
        >
            <Pressable
                accessibilityLabel={accessibilityText}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={onPress}
                testID={testID}
                style={isClose ? styles.closeContent : styles.deleteContent}
            >
                {isClose ? (
                    <SymbolView
                        name="xmark"
                        size={16}
                        tintColor={isDark ? "#FFFFFF" : "#000000"}
                        weight="regular"
                    />
                ) : (
                    <Text style={[styles.deleteLabel, { color: isDark ? "#FFFFFF" : colors.danger }]}>{label}</Text>
                )}
            </Pressable>
        </GlassView>
    );
}

const styles = StyleSheet.create({
    glass: {
        height: 40,
        borderCurve: "continuous",
        alignItems: "center",
        justifyContent: "center",
    },
    closeGlass: {
        width: 40,
        borderRadius: 20,
    },
    deleteGlass: {
        minWidth: 40,
        borderRadius: 20,
    },
    closeContent: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteContent: {
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    deleteLabel: {
        fontSize: 15,
        fontWeight: "600",
    },
});
