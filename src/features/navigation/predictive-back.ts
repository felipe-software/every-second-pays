import { NativeModule, requireOptionalNativeModule } from "expo";
import { useEffect, useEffectEvent } from "react";
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

type BackProgressHandlers = {
    onProgress: (progress: number) => void;
    onCancel: () => void;
};

export function useBackProgress(enabled: boolean, handlers: BackProgressHandlers) {
    const handleProgress = useEffectEvent((event: { progress: number }) => handlers.onProgress(event.progress));
    const handleCancel = useEffectEvent(() => handlers.onCancel());

    useEffect(() => {
        if (!enabled || !NATIVE) return;
        const progress = NATIVE.addListener("onProgress", handleProgress);
        const cancel = NATIVE.addListener("onCancel", handleCancel);
        return () => {
            progress.remove();
            cancel.remove();
        };
    }, [enabled]);
}
