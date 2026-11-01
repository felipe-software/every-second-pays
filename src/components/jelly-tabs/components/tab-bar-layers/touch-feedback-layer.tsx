import {
    type AnimatedViewStyle,
    sharedStyles,
    type TouchFeedbackVisuals,
} from "./shared";
import { TouchFeedback } from "../touch-feedback";
import { memo } from "react";
import { View } from "react-native";

export interface TouchFeedbackLayerProps {
    animatedStyle: AnimatedViewStyle;
    radius: number;
    visuals: TouchFeedbackVisuals;
}

export const TouchFeedbackLayer = memo(function TouchFeedbackLayer({
    animatedStyle,
    radius,
    visuals,
}: TouchFeedbackLayerProps) {
    return (
        <View style={[sharedStyles.clip, { borderRadius: radius }]}>
            <TouchFeedback
                {...visuals}
                animatedStyle={animatedStyle}
            />
        </View>
    );
});
