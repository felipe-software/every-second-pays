import { useState } from "react";
import { View } from "react-native";

import type { Shift } from "../model";
import { useEarningsTheme } from "../theme";
import { DayDial } from "./day-dial";
import { HourPresets } from "./hour-presets";
import { ShiftChips } from "./shift-chips";

const NEW_SHIFT: Shift = { start: 780, end: 1020 };

export function HoursEditor({ shifts, onChange }: { shifts: Shift[]; onChange: (shifts: Shift[]) => void }) {
    const { colors } = useEarningsTheme();
    const [selected, setSelected] = useState(0);
    const selectedIndex = Math.min(selected, shifts.length - 1);

    const replaceShift = (index: number, next: Shift) => {
        onChange(shifts.map((item, itemIndex) => itemIndex === index ? next : item));
    };

    return (
        <View className="gap-4">
            <View className="gap-3 rounded-[28px] px-4 pt-3 pb-4" style={{ backgroundColor: colors.card }}>
                <DayDial
                    shifts={shifts}
                    selectedIndex={selectedIndex}
                    onSelect={setSelected}
                    onShiftChange={replaceShift}
                />
                <ShiftChips
                    shifts={shifts}
                    selectedIndex={selectedIndex}
                    onSelect={setSelected}
                    onAdd={() => {
                        onChange([...shifts, { ...NEW_SHIFT }]);
                        setSelected(shifts.length);
                    }}
                    onRemove={(index) => {
                        onChange(shifts.filter((_, itemIndex) => itemIndex !== index));
                        setSelected(Math.max(0, index - 1));
                    }}
                />
            </View>
            <HourPresets shifts={shifts} onPick={onChange} />
        </View>
    );
}
