import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface SelectionPopoverState {
  x: number;
  y: number;
  text: string;
}

/**
 * Watch for text selections inside `bodyRef`. Whenever the user finishes a
 * selection (mouseup / keyup) of >=3 characters, return the popover position
 * + selected text. Auto-clears on collapse.
 *
 * Robustness: stores a clone of the Range so that — if the browser ever
 * clears the selection while the popover is open (e.g., due to a focus
 * shift or DOM mutation by an unrelated component) — we re-apply it so the
 * highlighted text stays visibly selected.
 */
export function useTextSelection(
  bodyRef: RefObject<HTMLElement | null>,
): {
  popover: SelectionPopoverState | null;
  dismiss: () => void;
} {
  const [popover, setPopover] = useState<SelectionPopoverState | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const computeFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopover(null);
      savedRangeRef.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (text.length < 3) {
      setPopover(null);
      savedRangeRef.current = null;
      return;
    }
    const body = bodyRef.current;
    if (!body || !body.contains(range.commonAncestorContainer)) {
      setPopover(null);
      savedRangeRef.current = null;
      return;
    }
    // Clone the range so it stays alive even if the browser collapses the
    // live selection during subsequent re-renders.
    savedRangeRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    setPopover({ x: rect.left + rect.width / 2, y: rect.top - 12, text });
  }, [bodyRef]);

  useEffect(() => {
    const handler = (): void => {
      // Defer to next tick so the browser has finished updating the selection
      setTimeout(computeFromSelection, 1);
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("keyup", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("keyup", handler);
    };
  }, [computeFromSelection]);

  // While the popover is open, keep the visual selection alive. If anything
  // collapses the live selection, restore our saved range.
  useEffect(() => {
    if (!popover) return;
    const restore = (): void => {
      const saved = savedRangeRef.current;
      if (!saved) return;
      const sel = window.getSelection();
      if (!sel) return;
      const live = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      // If selection was collapsed or replaced, put our range back.
      if (!live || sel.isCollapsed || sel.toString().trim() !== popover.text) {
        sel.removeAllRanges();
        try {
          sel.addRange(saved.cloneRange());
        } catch {
          // ignore — saved range may have been invalidated
        }
      }
    };
    // Run once after render, then again on each selectionchange while popover open.
    restore();
    document.addEventListener("selectionchange", restore);
    return () => document.removeEventListener("selectionchange", restore);
  }, [popover]);

  const dismiss = useCallback((): void => {
    window.getSelection()?.removeAllRanges();
    savedRangeRef.current = null;
    setPopover(null);
  }, []);

  return { popover, dismiss };
}
