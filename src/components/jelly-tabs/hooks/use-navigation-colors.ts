import { DEFAULT_TAB_BAR_COLORS, type TabBarColors } from "../constants";
import type { JellyNavigationOptions } from "../types";
import { asColorString } from "../utils/navigation-tab-bar";
import { useMemo } from "react";

export const useNavigationColors = (
    colors: Partial<TabBarColors> | undefined,
    focusedOptions: JellyNavigationOptions | undefined,
) => {
    const activeTint = asColorString(focusedOptions?.tabBarActiveTintColor);
    const inactiveTint = asColorString(focusedOptions?.tabBarInactiveTintColor);
    const activeSurface = asColorString(focusedOptions?.tabBarActiveBackgroundColor);
    const inactiveSurface = asColorString(focusedOptions?.tabBarInactiveBackgroundColor);
    const {
        activeContent: overrideActiveContent,
        inactiveContent: overrideInactiveContent,
        selectedSurface: overrideSelectedSurface,
        surface: overrideSurface,
    } = colors ?? {};

    return useMemo<TabBarColors>(
        () => ({
            activeContent: overrideActiveContent ?? activeTint ?? DEFAULT_TAB_BAR_COLORS.activeContent,
            inactiveContent: overrideInactiveContent ?? inactiveTint ?? DEFAULT_TAB_BAR_COLORS.inactiveContent,
            selectedSurface: overrideSelectedSurface ?? activeSurface ?? DEFAULT_TAB_BAR_COLORS.selectedSurface,
            surface: overrideSurface ?? inactiveSurface ?? DEFAULT_TAB_BAR_COLORS.surface,
        }),
        [
            activeTint,
            inactiveTint,
            activeSurface,
            inactiveSurface,
            overrideActiveContent,
            overrideInactiveContent,
            overrideSelectedSurface,
            overrideSurface,
        ],
    );
};
