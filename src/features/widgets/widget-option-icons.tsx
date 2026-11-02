import { Circle, Ellipse } from "react-native-svg";

import { ChipIcon } from "./widget-options";

const OPTION_ICONS = {
    rain: "M7 4 5 9M13 5l-2 5M19 4l-2 5M9 14l-2 5M16 14l-2 5",
    stream: "M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0",
    fountain: "M12 21V10M12 10c-1.5-4-5.5-5.5-8.5-3.5M12 10c1.5-4 5.5-5.5 8.5-3.5",
    roll: "M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4",
    drop: "M12 4v11M7 10l5 5 5-5M5 20h14",
    flip: "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM5 12h14",
    blur: "M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6ZM4 12a8 8 0 0 1 2.3-5.6M12 4a8 8 0 0 1 5.6 2.3M20 12a8 8 0 0 1-2.3 5.6M12 20a8 8 0 0 1-5.6-2.3",
    slot: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM9 6v12M15 6v12",
    calm: "M3 12c3-2.5 6-2.5 9 0s6 2.5 9 0",
    lively: "M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0",
    wild: "M13 3 6 13h5l-1 8 7-10h-5l1-8Z",
    app: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM10.5 18h3",
    system: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17ZM12 3.5v17M12 8h5.5M12 12h8.5M12 16h5.5",
    light: "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
    dark: "M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z",
    today: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M11.5 15h1",
    week: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M7.5 15h9",
    month: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM4 10h16M9 3v4M15 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01",
    year: "M9 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM7 12h14M11 5v4M17 5v4M4 9.5V17",
};

type OptionIconValue = keyof typeof OPTION_ICONS | "orbit" | "none";

function optionIcon(value: OptionIconValue, selected: boolean) {
    if (value === "orbit") {
        return (
            <ChipIcon selected={selected}>
                <Ellipse cx={12} cy={12} rx={9.5} ry={5.5} />
                <Circle cx={12} cy={12} r={2} fill="currentColor" stroke="none" />
            </ChipIcon>
        );
    }
    if (value === "none") {
        return (
            <ChipIcon selected={selected} d="m6.5 17.5 11-11">
                <Circle cx={12} cy={12} r={8} />
            </ChipIcon>
        );
    }
    return <ChipIcon selected={selected} d={OPTION_ICONS[value]} />;
}

export function iconChips<T extends OptionIconValue>(values: readonly T[], selected: T, label: (value: T) => string) {
    return values.map((value) => ({ value, label: label(value), icon: optionIcon(value, value === selected) }));
}
