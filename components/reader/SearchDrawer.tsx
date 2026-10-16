"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EyeOff, Loader2, Search, X } from "lucide-react";
import type { BookSearchResponse } from "../../shared/api";

export interface SearchJump {
  chapterIndex: number;
  occurrence: number;
}

interface SearchDrawerProps {
  filename: string;
  currentChapterIndex: number;
  query: string;
  onQueryChange: (q: string) => void;
  active: SearchJump | null;
  onPick: (jump: SearchJump) => void;
  onClose: () => void;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

/**
 * Whole-book search. Chapters past the reader's position are counted but
 * their snippets are withheld (the server never sends them) so search can't
 * spoil what's ahead.
 */
function SearchDrawer({
  filename,
  currentChapterIndex,
  query,
  onQueryChange,
  active,
  onPick,
  onClose,
}: SearchDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<BookSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          through: String(currentChapterIndex),
        });
        const res = await fetch(
          `/api/books/${encodeURIComponent(filename)}/search?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setResult(await res.json());
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, filename, currentChapterIndex]);

  // Flat, in-order list of every visible match, for keyboard stepping.
  const picks = useMemo<SearchJump[]>(
    () =>
      (result?.chapters ?? []).flatMap((c) =>
        c.matches.map((m) => ({
          chapterIndex: c.chapterIndex,
          occurrence: m.occurrence,
        })),
      ),
    [result],
  );
  const activePos = active
    ? picks.findIndex(
        (p) =>
          p.chapterIndex === active.chapterIndex &&
          p.occurrence === active.occurrence,
      )
    : -1;

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [activePos]);

  const step = (delta: number): void => {
    if (picks.length === 0) return;
    const next =
      activePos === -1
        ? delta > 0
          ? 0
          : picks.length - 1
        : (activePos + delta + picks.length) % picks.length;
    onPick(picks[next]);
  };

  const shownTotal = picks.length;
  const aheadTotal = (result?.chapters ?? [])
    .filter((c) => c.ahead)
    .reduce((n, c) => n + c.total, 0);

  return (
    <aside
      className="fixed bottom-4 left-4 top-19 z-55 flex w-88 flex-col overflow-hidden rounded-2xl border border-rule-2 bg-paper shadow-drawer"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="border-b border-rule-2 px-5 pb-3.5 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="kicker">Search this book</span>
          <button
            onClick={onClose}
            className="btn-reset cursor-pointer text-ink-3"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-rule bg-bg px-3 py-2 focus-within:border-accent">
          <Search size={14} className="shrink-0 text-accent" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                step(e.shiftKey ? -1 : 1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                step(-1);
              }
            }}
            placeholder="Words, names, phrases…"
            className="min-w-0 flex-1 border-none bg-transparent font-serif text-prose text-ink outline-hidden"
            aria-label="Search this book"
          />
          {loading && (
            <Loader2 size={14} className="shrink-0 animate-spin text-ink-3" />
          )}
        </div>
        <div className="mono-caption mt-2 flex items-center justify-between">
          <span>
            {trimmed.length < MIN_QUERY
              ? "Type at least 2 characters"
              : result
                ? `${shownTotal} match${shownTotal === 1 ? "" : "es"} so far`
                : "Searching…"}
          </span>
          {activePos >= 0 && (
            <span className="tabular-nums text-accent">
              {activePos + 1} / {shownTotal}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {error && (
          <p className="px-2 text-meta text-ink-3">Search failed: {error}</p>
        )}
        {result && result.chapters.length === 0 && (
          <p className="px-2 font-serif text-meta italic text-ink-3">
            No matches for “{result.query}”.
          </p>
        )}
        {result?.chapters.map((c) =>
          c.ahead ? (
            <button
              key={c.chapterId}
              onClick={() =>
                onPick({ chapterIndex: c.chapterIndex, occurrence: 0 })
              }
              className="toc-chapter-btn mb-1 w-full opacity-75"
              title="This chapter is ahead of you — jumping there may spoil it"
            >
              <span className="toc-chapter-num">
                {String(c.chapterIndex + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="toc-chapter-title">{c.title}</span>
                <span className="mono-caption ml-auto inline-flex shrink-0 items-center gap-1">
                  <EyeOff size={11} /> {c.total} ahead
                </span>
              </span>
            </button>
          ) : (
            <div key={c.chapterId} className="mb-3">
              <div className="flex items-baseline gap-2 px-2 pb-1">
                <span className="toc-chapter-num">
                  {String(c.chapterIndex + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-meta font-semibold text-ink">
                  {c.title}
                </span>
                <span className="mono-caption ml-auto shrink-0">{c.total}</span>
              </div>
              {c.matches.map((m) => {
                const isActive =
                  active?.chapterIndex === c.chapterIndex &&
                  active.occurrence === m.occurrence;
                return (
                  <button
                    key={m.occurrence}
                    ref={isActive ? activeRowRef : undefined}
                    onClick={() =>
                      onPick({
                        chapterIndex: c.chapterIndex,
                        occurrence: m.occurrence,
                      })
                    }
                    className={`btn-reset block w-full cursor-pointer rounded-lg border-l-2 px-3 py-2 text-left font-serif text-meta leading-normal transition-colors ${
                      isActive
                        ? "border-accent bg-bg-2 text-ink"
                        : "border-transparent text-ink-2 hover:bg-bg-2"
                    }`}
                  >
                    {m.before}
                    <mark className="search-snippet-mark">{m.match}</mark>
                    {m.after}
                  </button>
                );
              })}
              {c.total > c.matches.length && (
                <div className="mono-caption px-3 pt-1">
                  +{c.total - c.matches.length} more in this chapter
                </div>
              )}
            </div>
          ),
        )}
        {aheadTotal > 0 && (
          <div className="mx-2 mt-2 flex items-start gap-2 rounded-lg bg-bg-2 px-3 py-2.5 text-meta text-ink-3">
            <EyeOff size={13} className="mt-0.5 shrink-0" />
            <span>
              {aheadTotal} more in chapters you haven't reached. Snippets are
              hidden so search can't spoil them.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default SearchDrawer;
