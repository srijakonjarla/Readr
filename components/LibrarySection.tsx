"use client";

import React, { useRef, useState, useMemo } from "react";
import type { Book } from "../types";
import { headingStyle } from "../lib/styles";
import { HeroCard } from "./library/HeroCard";
import { BookCard } from "./library/BookCard";

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
      {/* Greeting block */}
      <div className="mb-14">
        <div className="status-pill">
          <span className="status-dot animate-pulse2" />
          Reading session active
        </div>
        <h1 className="mt-4 text-ink" style={headingStyle(64)}>
          {greetings()}
        </h1>
        <p className="mt-4 max-w-140 text-reading-size font-normal text-ink-2">
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

      {heroBook && <HeroCard book={heroBook} onOpen={handleOpenHero} />}

      {/* Library list */}
      {books.length > 0 && (
        <div>
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="m-0 text-h2 font-bold tracking-[-0.02em] text-ink">
              Your library
            </h2>
            <div className="flex gap-2">
              {(["all", "in-progress", "finished"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="nav-chip border border-rule-2 px-3.25 py-1.75 text-xs"
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

          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
            {otherBooks.map((book) => (
              <BookCard
                key={book.filename}
                book={book}
                onSelect={onBookSelect}
              />
            ))}
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

export default LibrarySection;
