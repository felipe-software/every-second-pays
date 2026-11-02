/* eslint-disable react-hooks/refs */
import { useRef } from "react";

const shallowEqual = <T extends object>(a: T, b: T) => {
    if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
    }

    for (const key in a) {
        if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
            return false;
        }
    }

    return true;
};

export function useShallowStable<T extends object | undefined>(next: T): T {
    const ref = useRef(next);
    const previous = ref.current;

    if (previous !== next && (previous === undefined || next === undefined || !shallowEqual(previous, next))) {
        ref.current = next;
    }

    return ref.current;
}
