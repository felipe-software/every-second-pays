/* eslint-disable react-hooks/refs */
import { useRef } from "react";

export function useStableArray<T>(next: readonly T[], isEqual: (a: T, b: T) => boolean): readonly T[] {
    const ref = useRef(next);
    const previous = ref.current;

    if (
        previous !== next &&
        (previous.length !== next.length || !next.every((value, index) => isEqual(value, previous[index])))
    ) {
        ref.current = next;
    }

    return ref.current;
}
