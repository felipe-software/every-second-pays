import { Text, View } from "react-native";

import { RiseIn } from "@/components/elevated/rise-in";

/** A step's headline and supporting line, rising in one after the other. */
export function StepCopy({ title, body, delay = 0 }: { title: string; body: string; delay?: number }) {
    return (
        <View className="items-center px-8">
            <RiseIn delay={delay} distance={18}>
                <Text
                    accessibilityRole="header"
                    className="text-center font-sans text-[30px] font-bold text-ink"
                    style={{ letterSpacing: -0.9, lineHeight: 34 }}
                >
                    {title}
                </Text>
            </RiseIn>
            <RiseIn delay={delay + 90} distance={14}>
                <Text className="mt-3 max-w-[320px] text-center font-sans text-[16.5px] font-medium text-muted" style={{ lineHeight: 23 }}>
                    {body}
                </Text>
            </RiseIn>
        </View>
    );
}
