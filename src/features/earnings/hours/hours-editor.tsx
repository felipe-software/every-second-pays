import { useState } from "react";
import { View } from "react-native";

import { Card } from "@/components/settings-card";

import type { Shift } from "../model";
import { DayArc } from "./day-arc";
import { HourPresets } from "./hour-presets";
import { ShiftChips } from "./shift-chips";

const NEW_SHIFT: Shift = { start: 780, end: 1020 };

export function HoursEditor({ shifts, onChange }: { shifts: Shift[]; onChange: (shifts: Shift[]) => void }) {
    const [selected, setSelected] = useState(0);
    const selectedIndex = Math.min(selected, shifts.length - 1);

    const replaceShift = (index: number, next: Shift) => {
        onChange(shifts.map((item, itemIndex) => itemIndex === index ? next : item));
    };

    return (
        <View className="gap-4">
            <Card className="gap-3 px-4 pt-3 pb-4">
                <DayArc
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
            </Card>
            <HourPresets shifts={shifts} onPick={onChange} />
        </View>
    );
}
