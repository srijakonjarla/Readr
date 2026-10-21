import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SearchJump } from "../components/reader/SearchDrawer";
import type { Highlight } from "../types";
import {
  clearHighlight,
  findTextRanges,
  paintHighlight,
  scrollRangeIntoView,
} from "../util/textSearch";

interface UseBookSearchArgs {
  bodyRef: RefObject<HTMLDivElement | null>;
  currentChapterIndex: number;
  setCurrentChapterIndex: (i: number) => void;
  /** Rendered chapter HTML; matches are re-found whenever it changes. */
  chapterContent: string;
  /** The highlight painter rewrites Text nodes, so a change invalidates ranges. */
  chapterHighlights: Highlight[];
  /** Called whenever search opens, e.g. to close the TOC drawer. */
  onOpen: () => void;
}

/**
 * Book-search state for the reader: drawer open/close, the query, the active
 * match, the "/" shortcut, and painting matches in the open chapter.
 *
 * Must be called after `useHighlightPainter` so its paint effect runs after
 * the painter's DOM pass.
 */
export function useBookSearch({
  bodyRef,
  currentChapterIndex,
  setCurrentChapterIndex,
  chapterContent,
  chapterHighlights,
  onOpen,
}: UseBookSearchArgs) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [jump, setJump] = useState<SearchJump | null>(null);
  // Last match scrolled to, so repaints (e.g. a new highlight) don't yank
  // the page back to it.
  const scrolledJumpRef = useRef<SearchJump | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const openSearch = useCallback(() => {
    onOpenRef.current();
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setJump(null);
  }, []);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root || !open || query.trim().length < 2) {
      clearHighlight("search-match");
      clearHighlight("search-current");
      return;
    }
    const ranges = findTextRanges(root, query);
    paintHighlight("search-match", ranges);
    const current =
      jump?.chapterIndex === currentChapterIndex
        ? ranges[jump.occurrence]
        : undefined;
    paintHighlight("search-current", current ? [current] : []);
    if (current && scrolledJumpRef.current !== jump) {
      scrolledJumpRef.current = jump;
      scrollRangeIntoView(current);
    }
  }, [
    bodyRef,
    open,
    query,
    jump,
    currentChapterIndex,
    chapterContent,
    chapterHighlights,
  ]);

  // "/" opens search from anywhere that isn't a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return {
    searchOpen: open,
    openSearch,
    closeSearch,
    /** Props for <SearchDrawer>, minus filename and chapter. */
    drawerProps: {
      query,
      onQueryChange: (q: string) => {
        setQuery(q);
        setJump(null);
      },
      active: jump,
      onPick: (next: SearchJump) => {
        setJump(next);
        if (next.chapterIndex !== currentChapterIndex) {
          setCurrentChapterIndex(next.chapterIndex);
        }
      },
      onClose: closeSearch,
    },
  };
}
