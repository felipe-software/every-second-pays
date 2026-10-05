import { SymbolView } from "expo-symbols";
import bold from "expo-symbols/androidWeights/bold";
import type { ColorValue } from "react-native";

const NAME = { ios: "checkmark", android: "check", web: "check" } as const;
const WEIGHT = { ios: "bold", android: bold } as const;

/** A bold check mark from the platform's symbol set (SF Symbols on iOS, Material Symbols elsewhere). */
export function CheckIcon({ size, color }: { size: number; color: ColorValue }) {
    return <SymbolView name={NAME} weight={WEIGHT} size={size} tintColor={color} />;
}
