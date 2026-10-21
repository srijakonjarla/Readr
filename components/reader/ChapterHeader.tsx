"use client";

import React from "react";
import { BookOpen, Highlighter, Sparkles } from "lucide-react";
import type { Highlight } from "../../types";

interface ChapterHeaderProps {
  title: string;
  bookTitle: string;
  chapterHighlights: Highlight[];
}

/** Chapter title plus a meta row: book title and this chapter's mark counts. */
function ChapterHeader({
  title,
  bookTitle,
  chapterHighlights,
}: ChapterHeaderProps) {
  const threadCount = chapterHighlights.filter(
    (h) => h.kind === "thread",
  ).length;
  const highlightCount = chapterHighlights.filter(
    (h) => h.kind === "highlight",
  ).length;

  return (
    <>
      <h1 className="m-0 text-chapter font-bold tracking-[-0.035em] text-ink text-balance">
        {title || "Untitled chapter"}
      </h1>

      <div className="mt-10 mb-14 flex flex-wrap items-center gap-4 text-xs font-medium text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={12} /> {bookTitle}
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
    </>
  );
}

export default ChapterHeader;
