import type { Metadata } from "epub";
import type { BookChapter, BookJsonData } from "@/shared/api";
import { getBook, listChapters } from "@/lib/db/books";

const MAX_CHARS_PER_CHAPTER_JSON = 5000;

/**
 * DB-backed whole-book JSON for the chat context. Strips chapter HTML to
 * plain text and truncates each chapter to keep prompts within token limits.
 */
export async function loadBookJsonFromDb(
  filename: string,
): Promise<BookJsonData> {
  const book = await getBook(filename);
  if (!book) {
    throw new Error("Book not found.");
  }
  const dbChapters = await listChapters(filename);
  const metadata = {
    title: book.title || filename,
    creator: book.author || "",
  } as Metadata;
  const chapters: BookChapter[] = dbChapters.map((c) => {
    let plainText = c.html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    let truncated = false;
    if (plainText.length > MAX_CHARS_PER_CHAPTER_JSON) {
      plainText =
        plainText.substring(0, MAX_CHARS_PER_CHAPTER_JSON) + "... (truncated)";
      truncated = true;
    }
    return {
      id: c.chapterId,
      title: c.title || `Chapter ${c.idx + 1}`,
      content: plainText,
      truncated,
    };
  });
  return { metadata, chapters };
}
