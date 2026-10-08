import {
    DropdownMenu,
    DropdownMenuItem,
    Host,
    Icon,
    RNHostView,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

import type { WidgetMenuRowProps } from "./widget-menu-row.types";

const CHECK_ICON = require("../../assets/icons/check.xml");
const ROW_HEIGHT = 54;

function UpDownChevron({ color }: { color: string }) {
    return (
        <Svg width={12} height={14} viewBox="0 0 12 14">
            <Path d="m3 5 3-3 3 3M3 9l3 3 3-3" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function WidgetMenuRow<T extends string>({ label, value, options, onChange, testID }: WidgetMenuRowProps<T>) {
    const [open, setOpen] = useState(false);
    const { colors, isDark } = useEarningsTheme();
    const selected = options.find((option) => option.value === value);

    return (
        <View>
            <Pressable
                testID={testID}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${selected?.label ?? ""}`}
                accessibilityState={{ expanded: open }}
                onPress={() => {
                    appHaptics.selection();
                    setOpen(true);
                }}
                className="flex-row items-center gap-2 px-4"
                style={{ minHeight: ROW_HEIGHT }}
            >
                <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                <Text className="font-sans text-[14px] text-muted">{selected?.label}</Text>
                <UpDownChevron color={colors.muted} />
            </Pressable>
            <Host
                matchContents
                colorScheme={isDark ? "dark" : "light"}
                style={{ position: "absolute", top: 0, right: 0, width: 1, height: ROW_HEIGHT }}
            >
                <DropdownMenu
                    expanded={open}
                    onDismissRequest={() => setOpen(false)}
                    color={colors.row}
                    cornerRadius={24}
                    shadowElevation={12}
                >
                    <DropdownMenu.Trigger>
                        <RNHostView matchContents>
                            <View style={{ width: 1, height: ROW_HEIGHT }} />
                        </RNHostView>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Items>
                        {options.map((option) => {
                            const checked = option.value === value;
                            return (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => {
                                        setOpen(false);
                                        if (!checked) onChange(option.value);
                                    }}
                                    elementColors={{
                                        textColor: checked ? colors.accentDeep : colors.ink,
                                        trailingIconColor: colors.accentDeep,
                                    }}
                                >
                                    <DropdownMenuItem.Text>
                                        <ComposeText
                                            color={checked ? colors.accentDeep : colors.ink}
                                            style={{ fontFamily: "Archivo", fontSize: 16 }}
                                        >
                                            {option.label}
                                        </ComposeText>
                                    </DropdownMenuItem.Text>
                                    {checked ? (
                                        <DropdownMenuItem.TrailingIcon>
                                            <Icon source={CHECK_ICON} size={18} tint={colors.accentDeep} />
                                        </DropdownMenuItem.TrailingIcon>
                                    ) : null}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenu.Items>
                </DropdownMenu>
            </Host>
        </View>
    );
}
