import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  List,
  Search,
  Sparkles,
  BookOpen,
  Highlighter,
  Globe,
  StickyNote,
} from "lucide-react";
import type { Book, BookInfo, Highlight, TocItem } from "../types";
import TocDrawer from "./TocDrawer";

interface ReaderSectionProps {
  book: Book;
  onBackToLibrary: () => void;
  highlights: Highlight[];
  onAddHighlight: (h: Highlight) => void;
  onStartThread: (
    h: Highlight,
    chapterTitle: string,
    suggestedPrompt?: string,
  ) => void;
  onOpenChat: () => void;
  chatOpen: boolean;
  onChapterChange: (index: number) => void;
}

interface SelectionPopover {
  x: number;
  y: number;
  text: string;
}

const lastChapterKey = (filename: string): string =>
  `readr:lastChapter:${filename}`;

function ReaderSection({
  book,
  onBackToLibrary,
  highlights,
  onAddHighlight,
  onStartThread,
  onOpenChat,
  chatOpen,
  onChapterChange,
}: ReaderSectionProps) {
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1);
  const [chapterContent, setChapterContent] = useState<string>("");
  const [scrollPct, setScrollPct] = useState<number>(0);
  const [selPopover, setSelPopover] = useState<SelectionPopover | null>(null);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [showToc, setShowToc] = useState<boolean>(false);

  const articleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Fetch book details
  useEffect(() => {
    const fetchBookDetails = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(`/api/files/${book.filename}`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data: BookInfo = await response.json();
        setBookInfo(data);
        setToc(data.toc || []);
        const remembered = window.localStorage.getItem(
          lastChapterKey(book.filename),
        );
        const initialIdx = remembered ? Number.parseInt(remembered, 10) : 0;
        if (data.toc && data.toc.length > 0) {
          setCurrentChapterIndex(
            Number.isFinite(initialIdx) &&
              initialIdx >= 0 &&
              initialIdx < data.toc.length
              ? initialIdx
              : 0,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching book details:", error);
        alert(`Error fetching book details: ${message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchBookDetails();
  }, [book]);

  // Notify parent whenever the active chapter index changes
  useEffect(() => {
    onChapterChange(currentChapterIndex);
  }, [currentChapterIndex, onChapterChange]);

  // Load chapter content
  useEffect(() => {
    const loadChapter = async (chapterId: string): Promise<void> => {
      try {
        setChapterContent("");
        const response = await fetch(
          `/api/epub/${book.filename}/chapter/${chapterId}`,
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        setChapterContent(html);
        window.scrollTo({ top: 0 });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setChapterContent(`<p>Error loading chapter content: ${message}</p>`);
      }
    };
    if (currentChapterIndex >= 0 && toc[currentChapterIndex]) {
      loadChapter(toc[currentChapterIndex].id);
      window.localStorage.setItem(
        lastChapterKey(book.filename),
        String(currentChapterIndex),
      );
    }
  }, [currentChapterIndex, toc, book.filename]);

  // Scroll progress (window-based, since the reading column is in the document flow)
  useEffect(() => {
    const onScroll = (): void => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setScrollPct(pct);
      setSelPopover(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapterContent]);

  // Selection → popover
  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelPopover(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (text.length < 3) {
        setSelPopover(null);
        return;
      }
      // Only honor selections that started inside the reading body
      const body = bodyRef.current;
      if (!body || !body.contains(range.commonAncestorContainer)) {
        setSelPopover(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelPopover({
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
        text,
      });
    }, 1);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const dismissSelection = (): void => {
    window.getSelection()?.removeAllRanges();
    setSelPopover(null);
  };

  const currentChapter = toc[currentChapterIndex];
  const chapterTitle = currentChapter?.title ?? "";
  const chapterHighlights = highlights.filter(
    (h) => h.chapterIndex === currentChapterIndex,
  );
  const threadCount = chapterHighlights.filter(
    (h) => h.kind === "thread",
  ).length;
  const highlightCount = chapterHighlights.filter(
    (h) => h.kind === "highlight",
  ).length;

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

  // Intercept clicks on links inside the rendered EPUB chapter HTML
  // (e.g. an internal Contents page linking to other .xhtml files).
  const handleBodyClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor || !bodyRef.current?.contains(anchor)) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // External / scheme links — let the browser handle them
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;

      e.preventDefault();

      // Pure same-page fragment — scroll within current chapter
      if (href.startsWith("#")) {
        const id = href.slice(1);
        const el = bodyRef.current.querySelector(`#${CSS.escape(id)}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // Internal EPUB link: match by basename to a TOC entry
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
    [toc],
  );

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

  return (
    <article ref={articleRef} className="relative min-h-screen">
      {/* Floating top chrome */}
      <div className="pointer-events-none fixed left-4 right-4 top-4 z-40 flex items-center justify-between">
        <div className="float-pill">
          <button
            onClick={onBackToLibrary}
            className="pill-btn"
            title="Library"
          >
            <ArrowLeft size={15} />
          </button>
          <span className="pill-divider" />
          <button
            onClick={() => setShowToc(true)}
            className="pill-btn"
            title="Contents"
          >
            <List size={15} />
          </button>
          <button className="pill-btn" title="Search" disabled>
            <Search size={15} />
          </button>
        </div>

        <div
          className="float-pill"
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ink-2)",
          }}
        >
          <span style={{ color: "var(--ink-3)" }}>
            Ch. {currentChapterIndex + 1}
          </span>
          <span style={{ margin: "0 8px" }}>{chapterTitle || "—"}</span>
          <span style={{ color: "var(--ink-3)", marginRight: 8 }}>·</span>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              color: "var(--accent)",
            }}
          >
            {Math.round(
              ((currentChapterIndex + scrollPct) / Math.max(1, toc.length)) *
                100,
            )}
            %
          </span>
        </div>

        <div className="float-pill">
          <button
            onClick={() => setBookmarked((b) => !b)}
            className="pill-btn"
            title={bookmarked ? "Bookmarked" : "Bookmark"}
            style={bookmarked ? { color: "var(--accent)" } : undefined}
          >
            <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Left-rail chapter dots */}
      {toc.length > 1 && (
        <div
          className="fixed top-1/2 z-30 flex flex-col gap-2.5"
          style={{ left: 36, transform: "translateY(-50%)" }}
        >
          {toc.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCurrentChapterIndex(i)}
              title={c.title}
              style={{
                width: i === currentChapterIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background:
                  i === currentChapterIndex ? "var(--accent)" : "var(--rule)",
                transition: "all .25s ease",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Reading column */}
      <div
        className="mx-auto max-w-reading"
        style={{ padding: "140px 100px 220px" }}
      >
        {/* Chapter chip */}
        <div className="chip-accent mb-6">
          <BookOpen size={13} strokeWidth={2} />
          Chapter {currentChapterIndex + 1} of {toc.length}
        </div>

        {/* Chapter title */}
        <h1
          className="text-ink"
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1,
            textWrap: "balance",
          }}
        >
          {chapterTitle || "Untitled chapter"}
        </h1>

        {/* Meta row */}
        <div
          className="text-ink-3 flex flex-wrap items-center gap-4"
          style={{ margin: "40px 0 56px", fontSize: 12, fontWeight: 500 }}
        >
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
            <span
              className="inline-flex items-center gap-1.5"
              style={{ color: "var(--accent)" }}
            >
              <Sparkles size={12} /> {threadCount} thread
              {threadCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="reading-body"
          onClick={handleBodyClick}
          dangerouslySetInnerHTML={{ __html: chapterContent }}
        />

        {/* Up next card */}
        {currentChapterIndex < toc.length - 1 && (
          <div
            className="mt-20 grid items-center gap-6"
            style={{
              padding: 28,
              borderRadius: 16,
              background: "var(--paper)",
              border: "1px solid var(--rule-2)",
              gridTemplateColumns: "1fr auto",
            }}
          >
            <div>
              <div className="kicker mb-2">Up next</div>
              <div
                className="text-ink"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {toc[currentChapterIndex + 1]?.title}
              </div>
              <div className="text-ink-3 mt-1" style={{ fontSize: 14 }}>
                Chapter {currentChapterIndex + 2}
              </div>
            </div>
            <button onClick={navNext} className="btn-ink">
              Continue <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {/* Prev/Next chapter row at bottom */}
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

      {/* Bottom progress bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20"
        style={{ height: 3, background: "var(--bg-2)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${((currentChapterIndex + scrollPct) / Math.max(1, toc.length)) * 100}%`,
            background: "var(--accent)",
            transition: "width .1s linear",
          }}
        />
      </div>

      {/* Selection popover */}
      {selPopover && (
        <div
          style={{
            position: "fixed",
            left: selPopover.x,
            top: selPopover.y,
            transform: "translate(-50%, -100%)",
            background: "var(--ink)",
            borderRadius: 12,
            padding: 4,
            display: "flex",
            alignItems: "center",
            boxShadow: "0 12px 28px -10px rgba(0,0,0,.35)",
            zIndex: 90,
          }}
        >
          <button
            onClick={handleAsk}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--accent)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Sparkles size={13} /> Ask
          </button>
          <PopBtn
            onClick={handleHighlight}
            icon={<Highlighter size={13} />}
            label="Highlight"
          />
          <PopBtn icon={<Globe size={13} />} label="Define" disabled />
          <PopBtn icon={<StickyNote size={13} />} label="Note" disabled />
        </div>
      )}

      {/* Always-visible Companion FAB (hidden when chat is open) */}
      {!chatOpen && !showToc && (
        <button
          onClick={onOpenChat}
          className="fixed z-[60] flex items-center gap-2.5 rounded-full px-5 py-3.5 text-white shadow-lg transition-transform hover:scale-105"
          style={{
            right: 28,
            bottom: 28,
            background: "var(--accent)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,.25) inset, 0 12px 28px -8px rgba(0,0,0,.25)",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          <Sparkles size={16} />
          Ask the Companion
        </button>
      )}

      {/* TOC drawer */}
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

interface PopBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function PopBtn({ icon, label, onClick, disabled }: PopBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        all: "unset",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 12px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "rgba(255,255,255,.85)",
        fontSize: 12,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}

export default ReaderSection;
