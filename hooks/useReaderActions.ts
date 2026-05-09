"use client";

import { useCallback, type RefObject, type MouseEvent } from "react";
import type { Highlight, TocItem } from "../types";
import type { SelectionPopoverState } from "./useTextSelection";

interface UseReaderActionsArgs {
  bodyRef: RefObject<HTMLDivElement | null>;
  toc: TocItem[];
  currentChapterIndex: number;
  setCurrentChapterIndex: (i: number) => void;
  currentChapter: TocItem | undefined;
  chapterTitle: string;
  selPopover: SelectionPopoverState | null;
  dismissSelection: () => void;
  onAddHighlight: (h: Highlight) => void;
  onStartThread: (
    h: Highlight,
    chapterTitle: string,
    suggestedPrompt?: string,
  ) => void;
}

/**
 * Reader-page action handlers: chapter nav, body-click cross-chapter
 * resolution, and selection-popover ask/highlight.
 */
export function useReaderActions({
  bodyRef,
  toc,
  currentChapterIndex,
  setCurrentChapterIndex,
  currentChapter,
  chapterTitle,
  selPopover,
  dismissSelection,
  onAddHighlight,
  onStartThread,
}: UseReaderActionsArgs) {
  // Internal links inside the rendered EPUB chapter HTML — match the link's
  // basename against TOC entries' href to resolve cross-chapter navigation.
  const handleBodyClick = useCallback(
    (e: MouseEvent<HTMLDivElement>): void => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor || !bodyRef.current?.contains(anchor)) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;
      e.preventDefault();
      if (href.startsWith("#")) {
        const id = href.slice(1);
        const el = bodyRef.current.querySelector(`#${CSS.escape(id)}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const [pathPart] = href.split("#");
      const linkBase = (pathPart.split("/").pop() ?? "").toLowerCase();
      if (!linkBase) return;
      const idx = toc.findIndex((t) => {
        const tocHref = (t.href ?? "").split("/").pop()?.toLowerCase() ?? "";
        return tocHref === linkBase;
      });
      if (idx >= 0) {
        setCurrentChapterIndex(idx);
      } else {
        console.warn(
          "[ReaderSection] internal EPUB link did not match any TOC item:",
          href,
        );
      }
    },
    [toc, setCurrentChapterIndex, bodyRef],
  );

  const handleAsk = (): void => {
    if (!selPopover || !currentChapter) return;
    const h: Highlight = {
      id: `h-${Date.now()}`,
      kind: "thread",
      chapterId: currentChapter.id,
      chapterIndex: currentChapterIndex,
      text: selPopover.text,
      threadCount: 1,
    };
    onStartThread(h, chapterTitle, "What does this passage mean?");
    dismissSelection();
  };

  const handleHighlight = (): void => {
    if (!selPopover || !currentChapter) return;
    const h: Highlight = {
      id: `h-${Date.now()}`,
      kind: "highlight",
      chapterId: currentChapter.id,
      chapterIndex: currentChapterIndex,
      text: selPopover.text,
    };
    onAddHighlight(h);
    dismissSelection();
  };

  const navPrev = (): void => {
    if (currentChapterIndex > 0)
      setCurrentChapterIndex(currentChapterIndex - 1);
  };
  const navNext = (): void => {
    if (currentChapterIndex < toc.length - 1)
      setCurrentChapterIndex(currentChapterIndex + 1);
  };

  return { handleBodyClick, handleAsk, handleHighlight, navPrev, navNext };
}
