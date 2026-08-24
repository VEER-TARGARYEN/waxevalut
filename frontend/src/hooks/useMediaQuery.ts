import { useEffect, useState } from "react";

/** Reactive media-query hook. Used to recompose (not just restack) overlays on mobile:
 *  the observation modal becomes a bottom sheet, the graph inspector becomes a bottom sheet. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/** True below Tailwind's `sm` breakpoint (640px) — the phone layout. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 639px)");
}
