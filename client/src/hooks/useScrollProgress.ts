import { useEffect, useState } from "react";

/**
 * Track window scroll progress as a 0..1 fraction of the document height.
 * Optional `onScroll` is called whenever the scroll event fires (e.g. for
 * dismissing transient popovers).
 */
export function useScrollProgress(onScroll?: () => void): number {
  const [pct, setPct] = useState<number>(0);

  useEffect(() => {
    const handler = (): void => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setPct(next);
      onScroll?.();
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [onScroll]);

  return pct;
}
