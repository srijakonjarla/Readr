import { useEffect, useState } from "react";
import type { Book, BookInfo, TocItem } from "../types";

const lastChapterKey = (filename: string): string =>
  `readr:lastChapter:${filename}`;

interface UseChapterLoaderResult {
  bookInfo: BookInfo | null;
  toc: TocItem[];
  loading: boolean;
  currentChapterIndex: number;
  setCurrentChapterIndex: (i: number) => void;
  chapterContent: string;
}

export function useChapterLoader(book: Book): UseChapterLoaderResult {
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1);
  const [chapterContent, setChapterContent] = useState<string>("");

  // Initial load: book metadata + TOC. Restore last-read chapter from
  // localStorage when present, else start at 0.
  useEffect(() => {
    let cancelled = false;
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
        if (cancelled) return;
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
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching book details:", error);
        alert(`Error fetching book details: ${message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchBookDetails();
    return () => {
      cancelled = true;
    };
  }, [book]);

  // Load HTML for the active chapter and persist position.
  useEffect(() => {
    let cancelled = false;
    const loadChapter = async (chapterId: string): Promise<void> => {
      try {
        setChapterContent("");
        const response = await fetch(
          `/api/epub/${encodeURIComponent(book.filename)}/chapter/${encodeURIComponent(chapterId)}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        if (cancelled) return;
        setChapterContent(html);
        window.scrollTo({ top: 0 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (!cancelled) {
          setChapterContent(`<p>Error loading chapter content: ${message}</p>`);
        }
      }
    };
    if (currentChapterIndex >= 0 && toc[currentChapterIndex]) {
      void loadChapter(toc[currentChapterIndex].id);
      window.localStorage.setItem(
        lastChapterKey(book.filename),
        String(currentChapterIndex),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [currentChapterIndex, toc, book.filename]);

  return {
    bookInfo,
    toc,
    loading,
    currentChapterIndex,
    setCurrentChapterIndex,
    chapterContent,
  };
}
