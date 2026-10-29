import { useEffect, useLayoutEffect } from "react";

// React 18 warns about useLayoutEffect while rendering on the server.
export const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? useEffect : useLayoutEffect;
