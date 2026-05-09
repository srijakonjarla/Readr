"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import type { Book } from "../../types";
import { bookGradient, bookHue, chipHueColor } from "../../util/hue";
import { FONT } from "../../lib/styles";

interface HeroCardProps {
  book: Book;
  onOpen: (book: Book) => void;
}

export function HeroCard({ book, onOpen }: HeroCardProps) {
  const hue = bookHue(book.filename);
  return (
    <div
      className="card-hero mb-18 grid cursor-pointer grid-cols-[1fr_1.3fr]"
      onClick={() => onOpen(book)}
    >
      {/* Left: gradient cover */}
      <div
        className="flex min-h-95 flex-col justify-between p-10"
        style={{ background: bookGradient(hue) }}
      >
        <span className="hero-badge self-start">
          <span className="hero-badge-dot" />
          Currently reading
        </span>
        <div>
          <div
            className="mb-3.5 text-kicker font-semibold uppercase tracking-[0.16em]"
            style={{ color: chipHueColor(hue) }}
          >
            Your shelf
          </div>
          <div
            className="max-w-80 text-4xl font-semibold leading-[1.05] tracking-[-0.01em] text-white text-balance"
            style={{ fontFamily: FONT.serif }}
          >
            {book.metadata?.title || book.filename}
          </div>
          {book.metadata?.creator && (
            <div className="mt-2.5 text-sm font-medium text-white/70">
              {book.metadata.creator}
            </div>
          )}
        </div>
      </div>

      {/* Right: meta + resume */}
      <div className="flex flex-col px-11 py-10">
        <div className="kicker mb-4.5">Continue reading</div>
        <p
          className="m-0 mb-7 max-w-115 text-lg italic leading-[1.55] text-ink-2 text-pretty"
          style={{ fontFamily: FONT.serif }}
        >
          {book.metadata?.description ||
            `“A book on your shelf, waiting. Tap to step back in.”`}
        </p>
        <div className="flex-1" />
        <div className="grid grid-cols-3 gap-6 border-t border-rule-2 pt-7">
          <Stat
            label="Author"
            value={book.metadata?.creator?.split(" ")[0] ?? "—"}
          />
          <Stat label="Publisher" value={book.metadata?.publisher ?? "—"} />
          <Stat label="Format" value="EPUB" />
        </div>
        <div className="mt-7 flex items-center gap-3.5">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: "0%" }} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(book);
            }}
            className="btn-ink"
          >
            Resume <ArrowRight size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker mb-1.5 tracking-[0.04em]">{label}</div>
      <div className="truncate text-lg font-bold leading-[1.1] tracking-[-0.02em] text-ink">
        {value}
      </div>
    </div>
  );
}
