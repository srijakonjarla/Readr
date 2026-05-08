"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LibrarySection from "@/components/LibrarySection";
import type { Book } from "@/types";

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);

  const fetchBooks = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/books");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Book[] = await res.json();
      setBooks(data);
      // Send the user to upload if their shelf is empty.
      if (data.length === 0) router.replace("/upload");
    } catch (error) {
      console.error("Error fetching books:", error);
      router.replace("/upload");
    }
  }, [router]);

  useEffect(() => {
    void fetchBooks();
  }, [fetchBooks]);

  return (
    <main>
      <LibrarySection
        books={books}
        onBookSelect={(book) =>
          router.push(`/preview/${encodeURIComponent(book.filename)}`)
        }
        onOpenBook={(book) =>
          router.push(`/read/${encodeURIComponent(book.filename)}`)
        }
        onUploadSuccess={() => void fetchBooks()}
      />
    </main>
  );
}
