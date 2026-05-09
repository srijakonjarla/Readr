"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import type { Book } from "../../types";
import MiniCover from "../MiniCover";
import { bookHue } from "../../util/hue";

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  const cardHue = bookHue(book.filename);
  return (
    <button
      onClick={() => onSelect(book)}
      className="card book-card group flex w-full items-stretch gap-4.5 p-4.5 text-left transition-all hover:-translate-y-0.5"
    >
      <MiniCover hue={cardHue} title={book.metadata?.title} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 truncate text-base font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
          {book.metadata?.title || book.filename}
        </div>
        <div className="mb-3 text-meta text-ink-3">
          {book.metadata?.creator || "Unknown author"}
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-kicker font-semibold tracking-[0.02em] text-ink-3">
            <BookOpen size={12} /> EPUB
          </span>
          {book.metadata?.publisher && (
            <span className="meta-chip">{book.metadata.publisher}</span>
          )}
        </div>
      </div>
    </button>
  );
}
