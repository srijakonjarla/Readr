import { useEffect, useState, type RefObject } from "react";
import type { Highlight } from "../types";

export interface HighlightPopoverState {
  x: number;
  y: number;
  highlight: Highlight;
}

interface FlatSegment {
  node: Text;
  flatStart: number;
  length: number;
}

function buildFlat(
  root: HTMLElement,
  withSeparators: boolean,
): {
  flat: string;
  segments: FlatSegment[];
} {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const el = (n as Text).parentElement;
      // Skip text already inside a painted mark (we re-paint from scratch each
      // pass, but defensively avoid nested marks).
      if (el && el.closest("mark[data-rd-id]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const segments: FlatSegment[] = [];
  let flat = "";
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const text = n.textContent ?? "";
    if (text.length === 0) continue;
    if (withSeparators && segments.length > 0) {
      // Synthetic separator so cross-block-element selections (where
      // Selection.toString() inserts a "\n") still match against the DOM
      // concat (which has nothing between block boundaries).
      flat += " ";
    }
    segments.push({
      node: n as Text,
      flatStart: flat.length,
      length: text.length,
    });
    flat += text;
  }
  return { flat, segments };
}

// Map a position in the whitespace-collapsed view of `flat` back to its raw
// index in `flat`. Walks character-by-character, treating a run of whitespace
// in raw as one whitespace in normalized.
function rawIndexFromNormalized(flat: string, normPos: number): number {
  let raw = 0;
  let norm = 0;
  while (raw < flat.length && norm < normPos) {
    if (/\s/.test(flat[raw])) {
      norm += 1;
      raw += 1;
      while (raw < flat.length && /\s/.test(flat[raw])) raw++;
    } else {
      norm += 1;
      raw += 1;
    }
  }
  return raw;
}

function rawEndFromNormalized(
  flat: string,
  startRaw: number,
  normLen: number,
): number {
  let raw = startRaw;
  let norm = 0;
  while (raw < flat.length && norm < normLen) {
    if (/\s/.test(flat[raw])) {
      norm += 1;
      raw += 1;
      while (raw < flat.length && /\s/.test(flat[raw])) raw++;
    } else {
      norm += 1;
      raw += 1;
    }
  }
  return raw;
}

function findRawRange(
  flat: string,
  target: string,
): { start: number; end: number } | null {
  const direct = flat.indexOf(target);
  if (direct >= 0) return { start: direct, end: direct + target.length };
  // Fallback: collapse whitespace in both, search, then map back.
  const flatN = flat.replace(/\s+/g, " ");
  const targetN = target.replace(/\s+/g, " ").trim();
  if (!targetN) return null;
  const normIdx = flatN.indexOf(targetN);
  if (normIdx < 0) return null;
  const start = rawIndexFromNormalized(flat, normIdx);
  const end = rawEndFromNormalized(flat, start, targetN.length);
  return { start, end };
}

function wrapSegments(
  segments: FlatSegment[],
  start: number,
  end: number,
  className: string,
  id: string,
): boolean {
  let wrapped = false;
  for (const seg of segments) {
    const segEnd = seg.flatStart + seg.length;
    if (segEnd <= start) continue;
    if (seg.flatStart >= end) break;
    const localStart = Math.max(0, start - seg.flatStart);
    const localEnd = Math.min(seg.length, end - seg.flatStart);
    if (localEnd <= localStart) continue;
    try {
      const range = document.createRange();
      range.setStart(seg.node, localStart);
      range.setEnd(seg.node, localEnd);
      const mark = document.createElement("mark");
      mark.className = className;
      mark.dataset.rdId = id;
      range.surroundContents(mark);
      wrapped = true;
    } catch (error) {
      console.warn("[useHighlightPainter] surroundContents failed", error);
    }
  }
  return wrapped;
}

/**
 * After chapter content renders, walk the DOM inside `bodyRef` and inject
 * <mark> wrappers for each highlight. Selections that span multiple text
 * nodes (the common case — anything crossing an inline element or a paragraph
 * break) are wrapped as multiple sibling <mark> elements that share an id.
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

    // Rebuild the flat string + segments on each iteration — wrapping a
    // highlight splits Text nodes, invalidating offsets for subsequent passes.
    for (const h of highlights) {
      const target = h.text.trim();
      if (target.length < 3) continue;
      const className = h.kind === "thread" ? "rd-thread" : "rd-highlight";
      // Try without separators first (handles contiguous-inline like
      // "First<em>mid</em>last"); fall back to with-separators (handles
      // cross-paragraph selections where Selection.toString() inserts "\n"
      // but the DOM concat has nothing between block boundaries).
      const tight = buildFlat(root, false);
      let range = findRawRange(tight.flat, target);
      let segments = tight.segments;
      if (!range) {
        const padded = buildFlat(root, true);
        range = findRawRange(padded.flat, target);
        segments = padded.segments;
      }
      if (!range) {
        console.warn(
          "[highlight] no DOM match for:",
          JSON.stringify(target.slice(0, 80)),
        );
        continue;
      }
      wrapSegments(segments, range.start, range.end, className, h.id);
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
