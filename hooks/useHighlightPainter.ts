import { useEffect, useState, type RefObject } from "react";
import type { Highlight } from "../types";

export interface HighlightPopoverState {
  x: number;
  y: number;
  highlight: Highlight;
}

/**
 * After chapter content renders, walk the DOM inside `bodyRef` and inject
 * <mark> wrappers for each highlight that matches a contiguous text node.
 *
 * Click handler: when a painted <mark> is clicked, expose a popover state so
 * the parent can render an Open-in-chat / Remove menu.
 *
 * Limits (deliberate):
 *   - Only the first occurrence of each highlight's text is wrapped.
 *   - Highlights whose text spans multiple HTML elements are skipped (a
 *     proper splitter could fix this later).
 */
export function useHighlightPainter(
  bodyRef: RefObject<HTMLElement | null>,
  highlights: Highlight[],
  contentVersion: unknown,
): {
  popover: HighlightPopoverState | null;
  dismiss: () => void;
} {
  const [popover, setPopover] = useState<HighlightPopoverState | null>(null);

  // Paint pass — runs whenever content or the highlights array changes.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    // Clear previously injected marks
    root.querySelectorAll("mark[data-rd-id]").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    root.normalize();

    if (!highlights.length) return;

    for (const h of highlights) {
      const target = h.text.trim();
      if (target.length < 3) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        const idx = text.indexOf(target);
        if (idx < 0) continue;
        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + target.length);
          const mark = document.createElement("mark");
          mark.className = h.kind === "thread" ? "rd-thread" : "rd-highlight";
          mark.dataset.rdId = h.id;
          range.surroundContents(mark);
        } catch {
          // surroundContents throws when the range crosses element
          // boundaries; quietly skip this highlight.
        }
        break;
      }
    }
  }, [bodyRef, highlights, contentVersion]);

  // Click pass — open the menu popover above any clicked mark.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    const handler = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      const mark = target.closest("mark[data-rd-id]") as HTMLElement | null;
      if (!mark) return;
      const id = mark.dataset.rdId;
      if (!id) return;
      const h = highlights.find((x) => x.id === id);
      if (!h) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = mark.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
        highlight: h,
      });
    };
    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, [bodyRef, highlights]);

  return {
    popover,
    dismiss: () => setPopover(null),
  };
}
