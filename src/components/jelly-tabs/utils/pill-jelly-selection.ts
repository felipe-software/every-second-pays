import { getMaxTabIndex } from "./animation";

export const getControlledSelectedIndex = (selectedIndex: number | null, tabCount: number) => {
    if (selectedIndex === null || selectedIndex < 0 || tabCount === 0) {
        return -1;
    }

    return Math.min(selectedIndex, getMaxTabIndex(tabCount));
};

export const getInitialSelectedIndex = (controlledSelectedIndex: number | null | undefined, tabCount: number) => {
    if (controlledSelectedIndex !== undefined) {
        return getControlledSelectedIndex(controlledSelectedIndex, tabCount);
    }

    return tabCount > 0 ? 0 : -1;
};
