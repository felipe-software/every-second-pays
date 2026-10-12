import { useState } from "react";
import { View } from "react-native";

import { usePressHighlight } from "@/components/settings-card";
import { appHaptics } from "@/features/haptics/haptics";

import { LanguageMenu } from "./language-menu";
import { type LanguagePreference, useLanguageStore } from "./store";

export function useLanguageSetting() {
    const { preference, hydrated, saving, loading, loadError, update, load } = useLanguageStore();
    const [saveError, setSaveError] = useState(false);

    const change = (value: LanguagePreference) => {
        if (value === preference || saving) return;
        appHaptics.selection();
        setSaveError(false);
        update(value).catch(() => setSaveError(true));
    };

    return { preference, disabled: !hydrated || loading || loadError, loadError, saveError, change, load };
}

export function LanguageRow({ setting }: { setting: ReturnType<typeof useLanguageSetting> }) {
    const highlight = usePressHighlight();
    return (
        <View testID="language-selector" style={highlight.style}>
            <LanguageMenu
                preference={setting.preference}
                disabled={setting.disabled}
                onOpen={appHaptics.selection}
                onPressIn={highlight.onPressIn}
                onPressOut={highlight.onPressOut}
                onChange={setting.change}
            />
        </View>
    );
}
