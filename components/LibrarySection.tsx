"use client";

import React, { useRef, useState, useMemo } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Book } from "../types";
import MiniCover from "./MiniCover";
import { bookGradient, bookHue, chipHueColor } from "../util/hue";
import { FONT, headingStyle } from "../lib/styles";

interface LibrarySectionProps {
  books: Book[];
  onBookSelect: (book: Book) => void;
  onOpenBook: (book: Book) => void;
  onUploadSuccess: () => void;
}

const greetings = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "Good night.";
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
};

const lastBookKey = "readr:lastBookFilename";

function LibrarySection({
  books,
  onBookSelect,
  onOpenBook,
  onUploadSuccess,
}: LibrarySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"all" | "in-progress" | "finished">(
    "all",
  );

  const heroBook = useMemo<Book | null>(() => {
    if (books.length === 0) return null;
    const remembered = window.localStorage.getItem(lastBookKey);
    return books.find((b) => b.filename === remembered) ?? books[0];
  }, [books]);

  const otherBooks = useMemo(
    () => books.filter((b) => b.filename !== heroBook?.filename),
    [books, heroBook],
  );

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      await response.json();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error uploading file:", error);
      alert(`Error uploading file: ${message}`);
    }
  };

  const handleOpenHero = (book: Book): void => {
    window.localStorage.setItem(lastBookKey, book.filename);
    onOpenBook(book);
  };

  return (
    <section className="mx-auto max-w-page px-14 pb-32">
      {/* Greeting block — no colored band, sits on the page background */}
      <div className="mb-14">
        <div className="status-pill">
          <span className="status-dot animate-pulse2" />
          Reading session active
        </div>
        <h1 className="mt-4 text-ink" style={headingStyle(64)}>
          {greetings()}
        </h1>
        <p className="mt-4 max-w-[560px] text-[19px] font-normal text-ink-2">
          {books.length === 0 ? (
            "Your shelf is empty. Upload an EPUB and settle in."
          ) : (
            <>
              You have{" "}
              <strong className="font-semibold text-ink">{books.length}</strong>{" "}
              book{books.length === 1 ? "" : "s"} on the shelf. Pick up where
              you left off.
            </>
          )}
        </p>
      </div>

      {/* Hero card */}
      {heroBook && (
        <div
          className="card-hero mb-[72px] grid cursor-pointer grid-cols-[1fr_1.3fr]"
          onClick={() => handleOpenHero(heroBook)}
        >
          {/* Left: gradient cover */}
          <div
            className="flex min-h-[380px] flex-col justify-between p-10"
            style={{ background: bookGradient(bookHue(heroBook.filename)) }}
          >
            <span className="hero-badge self-start">
              <span className="hero-badge-dot" />
              Currently reading
            </span>
            <div>
              <div
                className="mb-3.5 text-kicker font-semibold uppercase tracking-[0.16em]"
                style={{ color: chipHueColor(bookHue(heroBook.filename)) }}
              >
                Your shelf
              </div>
              <div
                className="max-w-[320px] text-[36px] font-semibold leading-[1.05] tracking-[-0.01em] text-white [text-wrap:balance]"
                style={{ fontFamily: FONT.serif }}
              >
                {heroBook.metadata?.title || heroBook.filename}
              </div>
              {heroBook.metadata?.creator && (
                <div className="mt-2.5 text-sm font-medium text-white/70">
                  {heroBook.metadata.creator}
                </div>
              )}
            </div>
          </div>

          {/* Right: meta + resume */}
          <div className="flex flex-col px-11 py-10">
            <div className="kicker mb-[18px]">Continue reading</div>
            <p
              className="m-0 mb-7 max-w-[460px] text-lg italic leading-[1.55] text-ink-2 [text-wrap:pretty]"
              style={{ fontFamily: FONT.serif }}
            >
              {heroBook.metadata?.description ||
                `“A book on your shelf, waiting. Tap to step back in.”`}
            </p>
            <div className="flex-1" />
            <div className="grid grid-cols-3 gap-6 border-t border-rule-2 pt-7">
              <Stat
                label="Author"
                value={heroBook.metadata?.creator?.split(" ")[0] ?? "—"}
              />
              <Stat
                label="Publisher"
                value={heroBook.metadata?.publisher ?? "—"}
              />
              <Stat label="Format" value="EPUB" />
            </div>
            <div className="mt-7 flex items-center gap-3.5">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: "0%" }} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenHero(heroBook);
                }}
                className="btn-ink"
              >
                Resume <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library list */}
      {books.length > 0 && (
        <div>
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-ink">
              Your library
            </h2>
            <div className="flex gap-2">
              {(["all", "in-progress", "finished"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="nav-chip border border-rule-2 px-[13px] py-[7px] text-xs"
                  aria-pressed={filter === f}
                >
                  {f === "all"
                    ? "All"
                    : f === "in-progress"
                      ? "In progress"
                      : "Finished"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]">
            {otherBooks.map((book) => {
              const cardHue = bookHue(book.filename);
              return (
                <button
                  key={book.filename}
                  onClick={() => onBookSelect(book)}
                  className="card book-card group flex w-full items-stretch gap-[18px] p-[18px] text-left transition-all hover:-translate-y-0.5"
                >
                  <MiniCover hue={cardHue} title={book.metadata?.title} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="mb-1 truncate text-base font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
                      {book.metadata?.title || book.filename}
                    </div>
                    <div className="mb-3 text-[13px] text-ink-3">
                      {book.metadata?.creator || "Unknown author"}
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] text-ink-3">
                        <BookOpen size={12} /> EPUB
                      </span>
                      {book.metadata?.publisher && (
                        <span className="meta-chip">
                          {book.metadata.publisher}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept=".epub"
        className="sr-only"
        onChange={handleFileChange}
      />
    </section>
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

export default LibrarySection;
