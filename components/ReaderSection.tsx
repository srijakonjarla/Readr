"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Highlighter,
  Sparkles,
} from "lucide-react";
import type { Book, Highlight } from "../types";
import TocDrawer from "./TocDrawer";
import FloatingChrome from "./reader/FloatingChrome";
import LeftRailDots from "./reader/LeftRailDots";
import UpNextCard from "./reader/UpNextCard";
import SelectionPopover from "./reader/SelectionPopover";
import HighlightPopover from "./reader/HighlightPopover";
import BottomProgressBar from "./reader/BottomProgressBar";
import SearchDrawer, { type SearchJump } from "./reader/SearchDrawer";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { useScrollProgress } from "../hooks/useScrollProgress";
import { useTextSelection } from "../hooks/useTextSelection";
import { useHighlightPainter } from "../hooks/useHighlightPainter";
import { useReaderActions } from "../hooks/useReaderActions";
import {
  clearHighlight,
  findTextRanges,
  paintHighlight,
  scrollRangeIntoView,
} from "../util/textSearch";

interface ReaderSectionProps {
  book: Book;
  onBackToLibrary: () => void;
  highlights: Highlight[];
  onAddHighlight: (h: Highlight) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onStartThread: (
    h: Highlight,
    chapterTitle: string,
    suggestedPrompt?: string,
  ) => void;
  onFocusThread: (highlightId: string) => void;
  onOpenChat: () => void;
  chatOpen: boolean;
  onChapterChange: (index: number) => void;
}

function ReaderSection({
  book,
  onBackToLibrary,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  onStartThread,
  onFocusThread,
  onOpenChat,
  chatOpen,
  onChapterChange,
}: ReaderSectionProps) {
  const {
    bookInfo,
    toc,
    loading,
    currentChapterIndex,
    setCurrentChapterIndex,
    chapterContent,
  } = useChapterLoader(book);

  const [showToc, setShowToc] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchJump, setSearchJump] = useState<SearchJump | null>(null);
  // Last match scrolled to, so repaints (e.g. a new highlight) don't yank
  // the page back to it.
  const scrolledJumpRef = useRef<SearchJump | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Notify parent of chapter changes (drives the spoiler-cutoff for chat).
  useEffect(() => {
    onChapterChange(currentChapterIndex);
  }, [currentChapterIndex, onChapterChange]);

  // Selection popover — dismissed on scroll alongside the progress callback.
  const { popover: selPopover, dismiss: dismissSelection } =
    useTextSelection(bodyRef);

  const onScrollDismissSelection = useCallback(() => {
    if (selPopover) dismissSelection();
  }, [selPopover, dismissSelection]);
  const scrollPct = useScrollProgress(onScrollDismissSelection);

  // Derive per-chapter highlight slice. Memoized so unrelated re-renders
  // (e.g. opening the selection popover) don't produce a new array identity
  // — the highlight painter depends on this array and its DOM-mutation pass
  // would otherwise collapse the user's live text selection.
  const currentChapter = toc[currentChapterIndex];
  const chapterTitle = currentChapter?.title ?? "";
  const chapterHighlights = useMemo(
    () => highlights.filter((h) => h.chapterIndex === currentChapterIndex),
    [highlights, currentChapterIndex],
  );
  // Stable object identity for dangerouslySetInnerHTML — without this, React
  // sees a new wrapper each render and re-applies innerHTML, which destroys
  // every Text node in the chapter (and any Range pointing at them).
  const bodyHtml = useMemo(
    () => ({ __html: chapterContent }),
    [chapterContent],
  );
  const threadCount = chapterHighlights.filter(
    (h) => h.kind === "thread",
  ).length;
  const highlightCount = chapterHighlights.filter(
    (h) => h.kind === "highlight",
  ).length;

  const { popover: hlPopover, dismiss: dismissHlPopover } = useHighlightPainter(
    bodyRef,
    chapterHighlights,
    chapterContent,
  );

  // Paint book-search matches in the open chapter. Runs after the highlight
  // painter (declared above), which rewrites Text nodes on every pass — so
  // ranges are rebuilt whenever its inputs change.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || !searchOpen || searchQuery.trim().length < 2) {
      clearHighlight("search-match");
      clearHighlight("search-current");
      return;
    }
    const ranges = findTextRanges(root, searchQuery);
    paintHighlight("search-match", ranges);
    const current =
      searchJump?.chapterIndex === currentChapterIndex
        ? ranges[searchJump.occurrence]
        : undefined;
    paintHighlight("search-current", current ? [current] : []);
    if (current && scrolledJumpRef.current !== searchJump) {
      scrolledJumpRef.current = searchJump;
      scrollRangeIntoView(current);
    }
  }, [
    searchOpen,
    searchQuery,
    searchJump,
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
      setShowToc(false);
      setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchJump(null);
  }, []);

  const { handleBodyClick, handleAsk, handleHighlight, navPrev, navNext } =
    useReaderActions({
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
    });

  if (loading) {
    return (
      <section className="mx-auto max-w-page px-14 py-32 text-center text-ink-3">
        Loading book…
      </section>
    );
  }

  if (!bookInfo) {
    return (
      <section className="mx-auto max-w-page px-14 py-32 text-center">
        <p className="text-ink-2 mb-4">Failed to load book.</p>
        <button onClick={onBackToLibrary} className="btn-soft">
          <ArrowLeft size={14} /> Back to Library
        </button>
      </section>
    );
  }

  const progressFraction =
    (currentChapterIndex + scrollPct) / Math.max(1, toc.length);

  return (
    <article className="relative min-h-screen">
      <FloatingChrome
        chapterIndex={currentChapterIndex}
        chapterCount={toc.length}
        chapterTitle={chapterTitle}
        progressFraction={progressFraction}
        bookmarked={bookmarked}
        onToggleBookmark={() => setBookmarked((b) => !b)}
        onBackToLibrary={onBackToLibrary}
        onShowToc={() => {
          closeSearch();
          setShowToc(true);
        }}
        onShowSearch={() => {
          if (searchOpen) {
            closeSearch();
          } else {
            setShowToc(false);
            setSearchOpen(true);
          }
        }}
        searchOpen={searchOpen}
      />

      <LeftRailDots
        toc={toc}
        currentIndex={currentChapterIndex}
        onSelect={setCurrentChapterIndex}
      />

      <div className="mx-auto max-w-reading pt-24 px-14 pb-36">
        <h1 className="m-0 text-chapter font-bold tracking-[-0.035em] text-ink text-balance">
          {chapterTitle || "Untitled chapter"}
        </h1>

        <div className="mt-10 mb-14 flex flex-wrap items-center gap-4 text-xs font-medium text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={12} /> {bookInfo.metadata?.title || "Book"}
          </span>
          {highlightCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Highlighter size={12} /> {highlightCount} highlight
              {highlightCount === 1 ? "" : "s"}
            </span>
          )}
          {threadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-accent">
              <Sparkles size={12} /> {threadCount} thread
              {threadCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div
          ref={bodyRef}
          className="reading-body"
          onClick={handleBodyClick}
          dangerouslySetInnerHTML={bodyHtml}
        />

        {currentChapterIndex < toc.length - 1 && (
          <UpNextCard
            title={toc[currentChapterIndex + 1]?.title ?? ""}
            chapterNumber={currentChapterIndex + 2}
            onContinue={navNext}
          />
        )}

        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={navPrev}
            disabled={currentChapterIndex <= 0}
            className="btn-soft"
          >
            <ArrowLeft size={14} /> Previous
          </button>
          <button
            onClick={navNext}
            disabled={currentChapterIndex >= toc.length - 1}
            className="btn-soft"
          >
            Next <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <BottomProgressBar fraction={progressFraction} />

      {selPopover && (
        <SelectionPopover
          x={selPopover.x}
          y={selPopover.y}
          onAsk={handleAsk}
          onHighlight={handleHighlight}
        />
      )}

      {hlPopover && (
        <HighlightPopover
          x={hlPopover.x}
          y={hlPopover.y}
          highlight={hlPopover.highlight}
          onPrimary={() => {
            const h = hlPopover.highlight;
            if (h.kind === "thread") {
              onFocusThread(h.id);
            } else {
              onStartThread(h, chapterTitle);
              onRemoveHighlight(h.id);
            }
            dismissHlPopover();
          }}
          onRemove={() => {
            onRemoveHighlight(hlPopover.highlight.id);
            dismissHlPopover();
          }}
          onDismiss={dismissHlPopover}
        />
      )}

      {!chatOpen && !showToc && (
        <button
          onClick={onOpenChat}
          className="fixed bottom-7 right-7 z-60 flex items-center gap-2.5 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold tracking-[-0.01em] text-white shadow-cta transition-transform hover:scale-105"
        >
          <Sparkles size={16} />
          Ask the Companion
        </button>
      )}

      {searchOpen && (
        <SearchDrawer
          filename={book.filename}
          currentChapterIndex={currentChapterIndex}
          query={searchQuery}
          onQueryChange={(q) => {
            setSearchQuery(q);
            setSearchJump(null);
          }}
          active={searchJump}
          onPick={(jump) => {
            setSearchJump(jump);
            if (jump.chapterIndex !== currentChapterIndex) {
              setCurrentChapterIndex(jump.chapterIndex);
            }
          }}
          onClose={closeSearch}
        />
      )}

      {showToc && (
        <TocDrawer
          toc={toc}
          currentIndex={currentChapterIndex}
          bookTitle={bookInfo.metadata?.title || book.filename}
          author={bookInfo.metadata?.creator}
          onSelect={(i) => {
            setCurrentChapterIndex(i);
            setShowToc(false);
          }}
          onClose={() => setShowToc(false)}
        />
      )}
    </article>
  );
}

export default ReaderSection;
