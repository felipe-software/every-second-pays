/* eslint-disable react-hooks/refs */
import { useRef } from "react";

function shallowEqual<T extends object>(a: T, b: T) {
    const left = Object.entries(a);
    const right = new Map(Object.entries(b));
    return (
        left.length === right.size && left.every(([key, value]) => right.has(key) && Object.is(value, right.get(key)))
    );
}

export function useShallowStable<T extends object | undefined>(next: T): T {
    const ref = useRef(next);
    const previous = ref.current;

    if (previous !== next && (previous === undefined || next === undefined || !shallowEqual(previous, next))) {
        ref.current = next;
    }

    return ref.current;
}
