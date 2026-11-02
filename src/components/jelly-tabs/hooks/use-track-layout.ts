import { type RefObject, useCallback, useEffect } from "react";
import { Dimensions, type LayoutChangeEvent, Platform, type View } from "react-native";

interface TrackLayoutOptions {
    setTrackWidth: (width: number) => void;
    setWebTrackPageX: (pageX: number) => void;
    setWebTrackWidth: (width: number) => void;
    trackRef: RefObject<View | null>;
}

export const useTrackLayout = ({ setTrackWidth, setWebTrackPageX, setWebTrackWidth, trackRef }: TrackLayoutOptions) => {
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
        [measureWebTrackPageX, setTrackWidth, setWebTrackWidth],
    );

    useEffect(() => {
        if (Platform.OS !== "web") {
            return undefined;
        }

        // A centered track can move on resize without changing width, so onLayout will not rerun.
        const subscription = Dimensions.addEventListener("change", measureWebTrackPageX);

        return () => subscription.remove();
    }, [measureWebTrackPageX]);

    return handleTrackLayout;
};
