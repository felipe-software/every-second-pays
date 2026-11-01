import {
    processColor,
    type StyleProp,
    StyleSheet,
    type ViewStyle,
} from "react-native";
import Animated, {
    type AnimatedStyle,
} from "react-native-reanimated";

export interface TouchFeedbackProps {
    animatedStyle: StyleProp<AnimatedStyle<ViewStyle>>;
    centerOpacity: number;
    color?: string;
    diameter: number;
    middleOpacity: number;
    offsetX?: number;
    offsetY?: number;
}

const withOpacity = (color: string, opacity: number) => {
    const argb = processColor(color);

    if (typeof argb !== "number") {
        return color;
    }

    return `rgba(${(argb >> 16) & 255},${(argb >> 8) & 255},${argb & 255},${opacity})`;
};

export const TouchFeedback = ({
    animatedStyle,
    centerOpacity,
    color = "#ffffff",
    diameter,
    middleOpacity,
    offsetX = 0,
    offsetY = 0,
}: TouchFeedbackProps) => (
    <Animated.View
        style={[
            styles.root,
            {
                experimental_backgroundImage: `radial-gradient(circle closest-side, ${withOpacity(color, centerOpacity)} 0%, ${withOpacity(color, middleOpacity)} 45%, ${withOpacity(color, 0)} 100%)`,
                height: diameter,
                left: offsetX,
                top: offsetY,
                width: diameter,
            },
            animatedStyle,
        ]}
    />
);

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        left: 0,
        top: 0,
    },
});
