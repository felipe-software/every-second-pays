import { Children, Fragment, type ReactNode, useState } from "react";
import { Pressable, type PressableProps, Text, View } from "react-native";

import { Raised } from "@/components/elevated/raised";
import { useEarningsTheme } from "@/features/earnings/theme";

export function SectionLabel({ children }: { children: string }) {
    return (
        <Text
            accessibilityRole="header"
            className="mt-7 mb-[9px] ml-1 font-sans text-[13px] font-semibold text-muted"
        >
            {children}
        </Text>
    );
}

export function CardDivider({ inset = 16 }: { inset?: number }) {
    return <View className="h-px bg-track opacity-70" style={{ marginLeft: inset, marginRight: 16 }} />;
}

export function SettingsCard({ children, dividerInset }: { children: ReactNode; dividerInset?: number }) {
    const rows = Children.toArray(children).filter(Boolean);
    return (
        <Raised surface="card" depth={3} radius={20} className="overflow-hidden">
            {rows.map((row, index) => (
                <Fragment key={index}>
                    {index > 0 ? <CardDivider inset={dividerInset} /> : null}
                    {row}
                </Fragment>
            ))}
        </Raised>
    );
}

export function IconTile({ children, size = 32 }: { children: ReactNode; size?: 32 | 44 }) {
    return (
        <View
            className="items-center justify-center bg-active"
            style={{ width: size, height: size, borderRadius: size === 44 ? 14 : 10 }}
        >
            {children}
        </View>
    );
}

export function usePressHighlight() {
    const { colors } = useEarningsTheme();
    const [pressed, setPressed] = useState(false);
    return {
        style: { backgroundColor: pressed ? `${colors.ink}0F` : "transparent" },
        onPressIn: () => setPressed(true),
        onPressOut: () => setPressed(false),
    };
}

export function SettingsRow({
    minHeight = 56,
    className = "",
    onPressIn,
    onPressOut,
    ...props
}: Omit<PressableProps, "style" | "children"> & { minHeight?: number; className?: string; children: ReactNode }) {
    const highlight = usePressHighlight();
    return (
        <Pressable
            {...props}
            onPressIn={(event) => {
                highlight.onPressIn();
                onPressIn?.(event);
            }}
            onPressOut={(event) => {
                highlight.onPressOut();
                onPressOut?.(event);
            }}
            className={`flex-row items-center gap-3 px-4 ${className}`}
            style={[{ minHeight }, highlight.style]}
        />
    );
}
