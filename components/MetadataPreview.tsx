"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Book, BookInfo } from "../types";
import { bookGradient, bookHue, chipHueColor } from "../util/hue";
import { FONT } from "../lib/styles";

interface MetadataPreviewProps {
  book: Book;
  onOpenBook: () => void;
  onBackToLibrary: () => void;
}

function MetadataPreview({
  book,
  onOpenBook,
  onBackToLibrary,
}: MetadataPreviewProps) {
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBookDetails = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/files/${encodeURIComponent(book.filename)}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BookInfo = await response.json();
        setBookInfo(data);
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

  const hue = bookHue(book.filename);

  if (loading) {
    return (
      <section className="mx-auto max-w-page px-6 pb-32">
        <div className="card flex items-center justify-center p-16 text-ink-3">
          Loading book details…
        </div>
      </section>
    );
  }

  if (!bookInfo) {
    return (
      <section className="mx-auto max-w-page px-6 pb-32">
        <div className="card flex flex-col items-center gap-4 p-16 text-center">
          <p className="text-ink-2">Failed to load book details.</p>
          <button onClick={onBackToLibrary} className="btn-soft">
            <ArrowLeft size={14} /> Back to Library
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-page px-6 pb-32">
      <div className="card-hero grid grid-cols-[1fr_1.3fr]">
        {/* Left: gradient cover */}
        <div
          className="flex min-h-[380px] flex-col justify-end p-10"
          style={{ background: bookGradient(hue) }}
        >
          <div
            className="mb-3.5 text-kicker font-semibold uppercase tracking-[0.16em]"
            style={{ color: chipHueColor(hue) }}
          >
            {bookInfo.toc?.length || 0} chapter
            {bookInfo.toc?.length === 1 ? "" : "s"}
          </div>
          <div
            className="max-w-[320px] text-[36px] font-semibold leading-[1.05] tracking-[-0.01em] text-white [text-wrap:balance]"
            style={{ fontFamily: FONT.serif }}
          >
            {bookInfo.metadata?.title || "Untitled"}
          </div>
          {bookInfo.metadata?.creator && (
            <div className="mt-2.5 text-sm font-medium text-white/70">
              {bookInfo.metadata.creator}
            </div>
          )}
        </div>

        {/* Right: meta + CTA */}
        <div className="flex flex-col gap-6 px-11 py-10">
          <div className="kicker">About this book</div>
          {bookInfo.metadata?.description ? (
            <div
              className="reading-body text-[17px] leading-[1.6] text-ink-2"
              dangerouslySetInnerHTML={{
                __html: bookInfo.metadata.description,
              }}
            />
          ) : (
            <p className="m-0 text-sm italic text-ink-3">
              No description provided.
            </p>
          )}

          <div className="grid grid-cols-2 gap-6 border-t border-rule-2 pt-4">
            <Stat
              label="Publisher"
              value={bookInfo.metadata?.publisher ?? "—"}
            />
            <Stat label="Language" value={bookInfo.metadata?.language ?? "—"} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onOpenBook} className="btn-ink">
              Start reading <ArrowRight size={15} strokeWidth={2.2} />
            </button>
            <button onClick={onBackToLibrary} className="btn-soft">
              <ArrowLeft size={14} /> Library
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker mb-1.5 tracking-[0.04em]">{label}</div>
      <div className="truncate text-base font-semibold tracking-[-0.01em] text-ink">
        {value}
      </div>
    </div>
  );
}

export default MetadataPreview;
