import { type StyleProp, StyleSheet, Text, type TextStyle } from "react-native";

interface TabBadgeProps {
    badge: number | string;
    displayScale: number;
    style: StyleProp<TextStyle>;
}

export const TabBadge = ({ badge, displayScale, style }: TabBadgeProps) => (
    <Text
        numberOfLines={1}
        selectable={false}
        style={[
            styles.badge,
            {
                borderRadius: 8 * displayScale,
                fontSize: 10 * displayScale,
                height: 16 * displayScale,
                lineHeight: 16 * displayScale,
                minWidth: 16 * displayScale,
                paddingHorizontal: 4 * displayScale,
                right: -10 * displayScale,
                top: -5 * displayScale,
            },
            style,
        ]}
    >
        {badge}
    </Text>
);

const styles = StyleSheet.create({
    badge: {
        backgroundColor: "#FF3B30",
        color: "#FFFFFF",
        fontWeight: "700",
        overflow: "hidden",
        position: "absolute",
        textAlign: "center",
    },
});
