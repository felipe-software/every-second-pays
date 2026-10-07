export type WidgetMenuRowProps<T extends string> = {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
    testID?: string;
};
