import { sharedStyles } from "./shared";
import { memo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

export interface SurfaceLayerProps {
    backdrop: ReactNode;
    color: string;
    opacity: number;
    radius: number;
}

export const SurfaceLayer = memo(function SurfaceLayer({
    backdrop,
    color,
    opacity,
    radius,
}: SurfaceLayerProps) {
    return (
        <View style={[sharedStyles.clip, { borderRadius: radius }]}>
            {backdrop}
            <View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: color, opacity },
                ]}
            />
        </View>
    );
});
