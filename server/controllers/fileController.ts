import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { EPub, type ManifestItem, type Metadata, type TocElement } from "epub";
import type { Request, Response } from "express";
import openaiService from "../services/openaiService";
import claudeService from "../services/claudeService";
import type { BookChapter, BookJsonData } from "../services/types";

interface BookSummary {
  filename: string;
  metadata: Metadata;
}

interface TocItem {
  id: string;
  href: string | undefined;
  title: string;
}

interface ChatRequestBody {
  query?: string;
  context?: string;
  filename?: string;
  currentChapterIndex?: number;
  provider?: "openai" | "claude";
}

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

const getChapterTitle = (
  item: ManifestItem | TocElement,
  index: number,
): string => {
  const maybeTitle = (item as Record<string, unknown>).title;
  return typeof maybeTitle === "string" && maybeTitle.trim() !== ""
    ? maybeTitle
    : `Chapter ${index + 1}`;
};

async function loadEpub(filePath: string, timeoutMs = 15000): Promise<EPub> {
  const epub = new EPub(filePath);
  await Promise.race([
    epub.parse(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`EPUB parse timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
  return epub;
}

export const uploadFile = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    return res.status(200).json({
      message: "File uploaded successfully",
      file: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
};

export const getFile = async (
  req: Request<{ filename: string }>,
  res: Response,
): Promise<void> => {
  const { filename } = req.params;
  console.log(`[getFile] Requested file info for: ${filename}`);

  if (!filename.toLowerCase().endsWith(".epub")) {
    res.status(400).json({ error: "Requested file is not an EPUB." });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fsSync.existsSync(filePath)) {
    console.error(`[getFile] File not found: ${filePath}`);
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    console.log(`[getFile] Parsing EPUB: ${filePath}`);
    const epub = await loadEpub(filePath);

    const useFlow = epub.flow && epub.flow.length > 0;
    const chapterSource: Array<ManifestItem | TocElement> = useFlow
      ? epub.flow
      : epub.toc;

    let toc: TocItem[] = [];
    if (chapterSource && chapterSource.length > 0) {
      console.log(
        `[getFile] Using ${useFlow ? "epub.flow" : "epub.toc"} for TOC mapping.`,
      );
      toc = chapterSource.map((item, index) => ({
        id: item.id,
        href: item.href,
        title: getChapterTitle(item, index),
      }));
    } else {
      console.warn(
        `[getFile] Both epub.flow and epub.toc are empty for ${filename}.`,
      );
    }

    res.json({
      metadata: epub.metadata,
      toc,
      filename,
    });
  } catch (error) {
    console.error(`[getFile] EPUB parsing error for ${filename}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to parse EPUB file" });
    }
  }
};

export const getEpubChapter = async (
  req: Request<{ filename: string; chapterId: string }>,
  res: Response,
): Promise<void> => {
  const { filename, chapterId } = req.params;
  console.log(
    `[getEpubChapter] Requested chapter: ID=${chapterId}, File=${filename}`,
  );
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fsSync.existsSync(filePath)) {
    console.error(`[getEpubChapter] File not found: ${filePath}`);
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const epub = await loadEpub(filePath);
    const text = await epub.getChapter(chapterId);
    console.log(
      `[getEpubChapter] Retrieved chapter ID ${chapterId}. Content length: ${text ? text.length : 0}`,
    );
    res.setHeader("Content-Type", "text/html");
    res.send(text || "");
  } catch (error) {
    console.error(`[getEpubChapter] Error for chapter ${chapterId}:`, error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: `Failed to get chapter content for ID: ${chapterId}` });
    }
  }
};

const getEpubMetadata = async (
  filePath: string,
  filename: string,
): Promise<BookSummary | null> => {
  if (!fsSync.existsSync(filePath)) {
    console.warn(
      `[getEpubMetadata] File disappeared before parsing: ${filename}`,
    );
    return null;
  }

  try {
    console.log(`[getEpubMetadata] Starting parse for ${filename}`);
    const epub = await loadEpub(filePath);
    console.log(
      `[getEpubMetadata] Successfully parsed metadata for ${filename}`,
    );
    return {
      filename,
      metadata: epub.metadata || ({ title: filename } as Metadata),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[getEpubMetadata] Error parsing metadata for ${filename}: ${message}`,
    );
    return null;
  }
};

export const getBooks = async (_req: Request, res: Response): Promise<void> => {
  console.log(`[getBooks] Reading directory: ${UPLOADS_DIR}`);

  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const files = await fs.readdir(UPLOADS_DIR);
    const epubFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".epub"),
    );
    console.log(`[getBooks] Found EPUB files:`, epubFiles);

    if (epubFiles.length === 0) {
      console.log(`[getBooks] No EPUB files found.`);
      res.json([]);
      return;
    }

    const bookPromises = epubFiles.map((filename) => {
      const filePath = path.join(UPLOADS_DIR, filename);
      return getEpubMetadata(filePath, filename);
    });

    const booksData = await Promise.all(bookPromises);
    const validBooksData = booksData.filter(
      (book): book is BookSummary => book !== null,
    );

    console.log(
      `[getBooks] Returning metadata for ${validBooksData.length} books.`,
    );
    res.json(validBooksData);
  } catch (error) {
    console.error("[getBooks] Error listing books:", error);
    res.status(500).json({ error: "Failed to list books" });
  }
};

const MAX_CHARS_PER_CHAPTER_JSON = 5000;

const loadBookJsonStructure = async (
  filePath: string,
): Promise<BookJsonData> => {
  console.log(
    `[loadBookJsonStructure] Loading JSON structure from: ${filePath}`,
  );
  if (!fsSync.existsSync(filePath)) {
    console.error(`[loadBookJsonStructure] File not found: ${filePath}`);
    throw new Error("Book file not found.");
  }

  let epub: EPub;
  try {
    epub = await loadEpub(filePath);
  } catch (error) {
    console.error("[loadBookJsonStructure] EPUB parsing error:", error);
    throw new Error("Failed to parse EPUB file.");
  }

  const bookJson: BookJsonData = {
    metadata: epub.metadata || ({} as Metadata),
    chapters: [],
  };

  const useFlow = epub.flow && epub.flow.length > 0;
  const chapterList: Array<ManifestItem | TocElement> = useFlow
    ? epub.flow
    : epub.toc || [];
  console.log(
    `[loadBookJsonStructure] EPUB metadata parsed. ${useFlow ? "flow" : "toc"} length: ${chapterList.length}`,
  );

  if (chapterList.length === 0) {
    console.warn(
      "[loadBookJsonStructure] EPUB flow/toc is empty. No chapters to include.",
    );
    return bookJson;
  }

  const chapterPromises: Promise<BookChapter>[] = chapterList.map(
    async (chapterRef, index) => {
      const fallbackTitle = getChapterTitle(chapterRef, index);
      try {
        const text = await epub.getChapter(chapterRef.id);
        let plainText = text
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        let truncated = false;
        if (plainText.length > MAX_CHARS_PER_CHAPTER_JSON) {
          plainText =
            plainText.substring(0, MAX_CHARS_PER_CHAPTER_JSON) +
            "... (truncated)";
          truncated = true;
        }
        return {
          id: chapterRef.id,
          title: fallbackTitle,
          content: plainText,
          truncated,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[loadBookJsonStructure] Error getting chapter ID ${chapterRef.id}: ${message}`,
        );
        return {
          id: chapterRef.id,
          title: fallbackTitle.replace(
            /^Chapter (\d+)/,
            "Chapter $1 (Error Loading)",
          ),
          content: null,
          error: message,
        };
      }
    },
  );

  bookJson.chapters = await Promise.all(chapterPromises);
  console.log(
    `[loadBookJsonStructure] Finished processing ${bookJson.chapters.length} chapters.`,
  );
  return bookJson;
};

export const handleChatQuery = async (
  req: Request<unknown, unknown, ChatRequestBody>,
  res: Response,
): Promise<Response> => {
  const { query, context, filename, currentChapterIndex, provider } = req.body;
  console.log(`[handleChatQuery] Received query: "${query}"`);
  console.log(
    `[handleChatQuery] Received selected text length: ${context ? context.length : 0}`,
  );
  console.log(`[handleChatQuery] Received filename: ${filename}`);
  console.log(
    `[handleChatQuery] currentChapterIndex: ${currentChapterIndex}, provider: ${provider}`,
  );

  if (!query) return res.status(400).json({ error: "No query provided" });
  if (!filename) return res.status(400).json({ error: "No filename provided" });

  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    const bookJsonData = await loadBookJsonStructure(filePath);
    console.log(
      `[handleChatQuery] Loaded book JSON. Total chapters: ${bookJsonData.chapters.length}`,
    );

    const totalChapters = bookJsonData.chapters.length;
    const cutoff =
      Number.isInteger(currentChapterIndex) &&
      typeof currentChapterIndex === "number" &&
      currentChapterIndex >= 0
        ? Math.min(currentChapterIndex + 1, totalChapters)
        : totalChapters;
    const trimmedBookJson: BookJsonData = {
      metadata: bookJsonData.metadata,
      chapters: bookJsonData.chapters.slice(0, cutoff),
    };
    console.log(
      `[handleChatQuery] Trimmed to ${trimmedBookJson.chapters.length}/${totalChapters} chapters (cutoff index ${cutoff - 1}).`,
    );

    const service = provider === "claude" ? claudeService : openaiService;
    const aiResponse = await service.getChatResponse(
      trimmedBookJson,
      context,
      query,
    );

    console.log(
      `[handleChatQuery] Response from ${provider === "claude" ? "Claude" : "OpenAI"} received.`,
    );
    return res.status(200).json(aiResponse);
  } catch (error) {
    console.error("[handleChatQuery] Error processing chat query:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process chat query";
    return res.status(500).json({ error: errorMessage });
  }
};
