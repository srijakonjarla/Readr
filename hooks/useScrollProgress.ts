import { useEffect, useState } from "react";

/**
 * Track window scroll progress as a 0..1 fraction of the document height.
 * Optional `onScroll` is called whenever the scroll event fires (e.g. for
 * dismissing transient popovers).
 */
export function useScrollProgress(onScroll?: () => void): number {
  const [pct, setPct] = useState<number>(0);

  useEffect(() => {
    // Compute initial fraction WITHOUT firing the onScroll side-effect —
    // otherwise re-attaching this listener on a dependency change would
    // immediately dismiss any selection popover that just came into being.
    const doc = document.documentElement;
    const initialMax = doc.scrollHeight - doc.clientHeight;
    setPct(
      initialMax > 0
        ? Math.min(1, Math.max(0, doc.scrollTop / initialMax))
        : 0,
    );

    const handler = (): void => {
      const max = doc.scrollHeight - doc.clientHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setPct(next);
      onScroll?.();
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [onScroll]);

  return pct;
}
