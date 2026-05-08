import { useCallback, useEffect, useState, type RefObject } from "react";

export interface SelectionPopoverState {
  x: number;
  y: number;
  text: string;
}

/**
 * Watch for text selections inside `bodyRef`. Whenever the user finishes a
 * selection (mouseup / keyup) of >=3 characters, return the popover position
 * + selected text. Auto-clears on collapse, and exposes a `dismiss` helper.
 */
export function useTextSelection(
  bodyRef: RefObject<HTMLElement | null>,
): {
  popover: SelectionPopoverState | null;
  dismiss: () => void;
} {
  const [popover, setPopover] = useState<SelectionPopoverState | null>(null);

  const computeFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (text.length < 3) {
      setPopover(null);
      return;
    }
    const body = bodyRef.current;
    if (!body || !body.contains(range.commonAncestorContainer)) {
      setPopover(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setPopover({ x: rect.left + rect.width / 2, y: rect.top - 12, text });
  }, [bodyRef]);

  useEffect(() => {
    // Defer to next tick so the browser has finished updating the selection
    const handler = (): void => {
      setTimeout(computeFromSelection, 1);
    };
    document.addEventListener("mouseup", handler);
    document.addEventListener("keyup", handler);
    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("keyup", handler);
    };
  }, [computeFromSelection]);

  const dismiss = useCallback((): void => {
    window.getSelection()?.removeAllRanges();
    setPopover(null);
  }, []);

  return { popover, dismiss };
}
