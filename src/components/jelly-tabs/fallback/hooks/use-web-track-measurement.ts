import { type RefObject, useCallback, useEffect, useState } from "react";
import { Dimensions, type LayoutChangeEvent, Platform, type View } from "react-native";

export const useWebTrackMeasurement = (
    trackRef: RefObject<View | null>,
    setTrackWidth: (width: number) => void,
    setWebTrackPageX: (pageX: number) => void,
) => {
    const [webTrackWidth, setWebTrackWidth] = useState(0);
    const measureWebTrackPageX = useCallback(() => {
        trackRef.current?.measureInWindow((x) => setWebTrackPageX(x));
    }, [setWebTrackPageX, trackRef]);
    const handleTrackLayout = useCallback(
        (event: LayoutChangeEvent) => {
            setTrackWidth(event.nativeEvent.layout.width);
            if (Platform.OS === "web") {
                setWebTrackWidth(event.nativeEvent.layout.width);
                measureWebTrackPageX();
            }
        },
        [measureWebTrackPageX, setTrackWidth],
    );

    useEffect(() => {
        if (Platform.OS !== "web") {
            return undefined;
        }

        const subscription = Dimensions.addEventListener("change", measureWebTrackPageX);

        return () => subscription.remove();
    }, [measureWebTrackPageX]);

    return { handleTrackLayout, webTrackWidth };
};
