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

// Walk all text nodes intersecting `range`, wrap each one's in-range portion
// with a <mark class={className}>. Returns the inserted marks so the caller
// can remove them on dismiss.
function wrapRangeWithMarks(
  range: Range,
  className: string,
): HTMLElement[] {
  const marks: HTMLElement[] = [];
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  // Single-text-node selection — wrap directly.
  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    try {
      const m = document.createElement("mark");
      m.className = className;
      const r = document.createRange();
      r.setStart(startNode, startOffset);
      r.setEnd(endNode, endOffset);
      r.surroundContents(m);
      marks.push(m);
    } catch {
      // Surround failed — skip silently.
    }
    return marks;
  }

  // Multi-node selection — collect intersecting text nodes first, then wrap.
  // Collecting first avoids walker invalidation as we mutate the DOM.
  const ancestor =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;
  if (!ancestor) return marks;

  const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      range.intersectsNode(n)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  for (const tn of textNodes) {
    const localStart = tn === startNode ? startOffset : 0;
    const localEnd = tn === endNode ? endOffset : tn.length;
    if (localEnd <= localStart) continue;
    try {
      const m = document.createElement("mark");
      m.className = className;
      const r = document.createRange();
      r.setStart(tn, localStart);
      r.setEnd(tn, localEnd);
      r.surroundContents(m);
      marks.push(m);
    } catch {
      // skip
    }
  }
  return marks;
}

/**
 * Watch for text selections inside `bodyRef`. Whenever the user finishes a
 * selection (mouseup / keyup) of >=3 characters, return the popover position
 * + selected text. While the popover is open, paint a <mark class="rd-pending">
 * over the saved range so the user keeps a visible highlight regardless of
 * what the browser does to the live Selection.
 */
export function useTextSelection(bodyRef: RefObject<HTMLElement | null>): {
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
    savedRangeRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    setPopover({ x: rect.left + rect.width / 2, y: rect.top - 12, text });
  }, [bodyRef]);

  useEffect(() => {
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

  // While the popover is open, paint a temporary mark over the saved range so
  // the user sees the visual selection consistently — independent of the
  // browser's live Selection state, which various flows can collapse.
  useEffect(() => {
    if (!popover) return;
    const saved = savedRangeRef.current;
    const root = bodyRef.current;
    if (!saved || !root) return;
    // Drop the live selection before painting — otherwise the browser's
    // ::selection layer composites on top of our rd-pending marks (and
    // tracks our DOM mutations unevenly), producing a darker stripe over
    // the portion of the range still considered "live".
    window.getSelection()?.removeAllRanges();
    const marks = wrapRangeWithMarks(saved, "rd-pending");
    return () => {
      for (const m of marks) {
        const parent = m.parentNode;
        if (!parent) continue;
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
      }
      root.normalize();
    };
  }, [popover, bodyRef]);

  const dismiss = useCallback((): void => {
    window.getSelection()?.removeAllRanges();
    savedRangeRef.current = null;
    setPopover(null);
  }, []);

  return { popover, dismiss };
}
