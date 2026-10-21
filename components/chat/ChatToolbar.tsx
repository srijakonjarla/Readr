"use client";

import React from "react";
import { Search, Trash2, X } from "lucide-react";

interface ChatToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  filtering: boolean;
  shownCount: number;
  totalCount: number;
  canClear: boolean;
  onClear: () => void;
}

/** Search box for the current context's asks, plus "Clear". */
function ChatToolbar({
  query,
  onQueryChange,
  filtering,
  shownCount,
  totalCount,
  canClear,
  onClear,
}: ChatToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule-2 px-5 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-rule bg-bg px-2.5 py-1 focus-within:border-accent">
        <Search size={12} className="shrink-0 text-accent" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQueryChange("");
          }}
          placeholder="Search asks…"
          aria-label="Search asks in this context"
          className="min-w-0 flex-1 border-none bg-transparent text-kicker text-ink outline-hidden"
        />
        {filtering && (
          <>
            <span className="mono-caption shrink-0 tabular-nums">
              {shownCount}/{totalCount}
            </span>
            <button
              onClick={() => onQueryChange("")}
              className="inline-flex shrink-0 cursor-pointer text-ink-3 btn-reset"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
      <button
        onClick={() => {
          if (!canClear) return;
          if (
            window.confirm(
              "Clear all asks in this context? Anchored selection (if any) will be kept.",
            )
          ) {
            onClear();
          }
        }}
        disabled={!canClear}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-kicker font-medium text-ink-3 btn-reset ${
          canClear
            ? "cursor-pointer opacity-100"
            : "cursor-not-allowed opacity-40"
        }`}
        title={
          totalCount === 0
            ? "Nothing to clear in this context"
            : "Clear all asks in this context"
        }
      >
        <Trash2 size={12} /> Clear
      </button>
    </div>
  );
}

export default ChatToolbar;
