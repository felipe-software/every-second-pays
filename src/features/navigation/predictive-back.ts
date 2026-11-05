import { NativeModule, requireOptionalNativeModule } from "expo";
import { useEffect } from "react";
import { Platform } from "react-native";

type PredictiveBackEvents = {
    onProgress(event: { progress: number }): void;
    onCancel(): void;
};

declare class PredictiveBackModule extends NativeModule<PredictiveBackEvents> {
    setSystemBackAllowed(allowed: boolean): void;
}

const NATIVE = Platform.OS === "android" ? requireOptionalNativeModule<PredictiveBackModule>("PredictiveBack") : null;

export function useSystemBackAllowed(allowed: boolean) {
    useEffect(() => {
        NATIVE?.setSystemBackAllowed(allowed);
    }, [allowed]);
}
