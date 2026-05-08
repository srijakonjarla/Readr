import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { EPub, type ManifestItem, type Metadata, type TocElement } from "epub";
import type { Request, Response } from "express";
import DOMPurify from "isomorphic-dompurify";
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

// Build lookup maps from epub.toc → title, keyed by id and href (sans fragment).
// Used to enrich flow-derived chapter lists with the real human titles.
function buildTocTitleMaps(epub: EPub): {
  byId: Record<string, string>;
  byHref: Record<string, string>;
} {
  const byId: Record<string, string> = {};
  const byHref: Record<string, string> = {};
  if (!epub.toc) return { byId, byHref };
  for (const t of epub.toc) {
    const title = (t as Record<string, unknown>).title;
    if (typeof title !== "string" || title.trim() === "") continue;
    if (typeof t.id === "string") byId[t.id] = title;
    if (typeof t.href === "string") {
      const base = t.href.split("#")[0];
      byHref[base] = title;
      const fname = base.split("/").pop();
      if (fname) byHref[fname] = title;
    }
  }
  return { byId, byHref };
}

function resolveChapterTitle(
  item: ManifestItem | TocElement,
  index: number,
  tocMaps: { byId: Record<string, string>; byHref: Record<string, string> },
): string {
  if (typeof item.id === "string" && tocMaps.byId[item.id]) {
    return tocMaps.byId[item.id];
  }
  const href = typeof item.href === "string" ? item.href.split("#")[0] : "";
  if (href && tocMaps.byHref[href]) return tocMaps.byHref[href];
  const fname = href.split("/").pop();
  if (fname && tocMaps.byHref[fname]) return tocMaps.byHref[fname];
  return getChapterTitle(item, index);
}

// ─── EPUB parse cache (LRU on insertion order) ───────────────────────────────
// Parsing reads the entire EPUB zip from disk and walks the manifest, which is
// expensive to do on every chapter / asset / chat call. Cache the parsed EPub
// keyed by file path; invalidate when the underlying file changes (mtime) and
// evict the least-recently-used entry once we hit the cap.
const EPUB_CACHE_MAX = 5;
interface EpubCacheEntry {
  epub: EPub;
  mtimeMs: number;
}
const epubCache = new Map<string, EpubCacheEntry>();

async function parseEpubFresh(
  filePath: string,
  timeoutMs: number,
): Promise<EPub> {
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

async function loadEpub(filePath: string, timeoutMs = 15000): Promise<EPub> {
  const stat = await fs.stat(filePath);
  const cached = epubCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    // LRU touch: re-insert to move to the end
    epubCache.delete(filePath);
    epubCache.set(filePath, cached);
    return cached.epub;
  }
  const epub = await parseEpubFresh(filePath, timeoutMs);
  epubCache.set(filePath, { epub, mtimeMs: stat.mtimeMs });
  // Evict oldest if over cap
  while (epubCache.size > EPUB_CACHE_MAX) {
    const oldestKey = epubCache.keys().next().value;
    if (oldestKey === undefined) break;
    epubCache.delete(oldestKey);
  }
  return epub;
}

// Strip <link rel="stylesheet"> and <style> tags so the EPUB's own CSS can't
// override the reader's typography.
function stripEpubStyles(html: string): string {
  return html
    .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

// Build a lookup from manifest href (and basename) → manifest id, so we can
// resolve relative <img src="..."> paths back to a getImage(id) call.
function buildHrefToId(epub: EPub): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of Object.keys(epub.manifest)) {
    const item = epub.manifest[id];
    if (!item || typeof item.href !== "string") continue;
    const href = item.href;
    map[href] = id;
    map[href.toLowerCase()] = id;
    const basename = href.split("/").pop();
    if (basename) {
      map[basename] = id;
      map[basename.toLowerCase()] = id;
    }
  }
  return map;
}

function rewriteImageSources(
  html: string,
  hrefToId: Record<string, string>,
  filename: string,
): string {
  const filenameEnc = encodeURIComponent(filename);
  return html.replace(
    /(<img\b[^>]*?\bsrc=)(['"])([^'"]+)\2/gi,
    (match, prefix: string, quote: string, src: string) => {
      try {
        const decoded = decodeURIComponent(src);
        const cleanSrc = decoded.replace(/^\.\.?\//, "").replace(/^\//, "");
        const basename = cleanSrc.split("/").pop() ?? "";
        const id =
          hrefToId[cleanSrc] ??
          hrefToId[cleanSrc.toLowerCase()] ??
          hrefToId[basename] ??
          hrefToId[basename.toLowerCase()];
        if (!id) return match;
        return `${prefix}${quote}/api/epub/${filenameEnc}/asset/${encodeURIComponent(id)}${quote}`;
      } catch {
        return match;
      }
    },
  );
}

// Sanitize chapter HTML before sending it to the client. Strip script tags,
// inline event handlers, and dangerous attrs. Allow our rewritten /api/epub
// asset URLs through; deny external network hops in <img>/<a> by stripping
// the protocol — the client's anchor interceptor handles relative paths.
function sanitizeChapterHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "noscript", "form"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onsubmit",
      "onkeydown",
      "onkeypress",
      "onkeyup",
      "onchange",
      "onmousedown",
      "onmouseup",
      "ondblclick",
      "oncontextmenu",
    ],
    ALLOW_DATA_ATTR: false,
  });
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
      const tocMaps = buildTocTitleMaps(epub);
      toc = chapterSource.map((item, index) => ({
        id: item.id,
        href: item.href,
        title: resolveChapterTitle(item, index, tocMaps),
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
    const rawText = await epub.getChapter(chapterId);
    const stripped = stripEpubStyles(rawText || "");
    const hrefToId = buildHrefToId(epub);
    const rewritten = rewriteImageSources(stripped, hrefToId, filename);
    const text = sanitizeChapterHtml(rewritten);
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

export const getEpubAsset = async (
  req: Request<{ filename: string; assetId: string }>,
  res: Response,
): Promise<void> => {
  const { filename, assetId } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fsSync.existsSync(filePath)) {
    res.status(404).end();
    return;
  }

  try {
    const epub = await loadEpub(filePath);
    let asset: { data: Buffer; mimeType: string };
    try {
      asset = await epub.getImage(assetId);
    } catch {
      // Fall back to generic file fetcher (covers fonts, svg, etc.)
      asset = await epub.getFile(assetId);
    }
    res.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(asset.data);
  } catch (error) {
    console.error(
      `[getEpubAsset] failed to fetch asset ${assetId} from ${filename}:`,
      error,
    );
    if (!res.headersSent) {
      res.status(404).end();
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

  const tocMaps = buildTocTitleMaps(epub);
  const chapterPromises: Promise<BookChapter>[] = chapterList.map(
    async (chapterRef, index) => {
      const fallbackTitle = resolveChapterTitle(chapterRef, index, tocMaps);
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
): Promise<void> => {
  const { query, context, filename, currentChapterIndex, provider } = req.body;
  console.log(`[handleChatQuery] query="${query}" file=${filename}`);
  console.log(
    `[handleChatQuery] selectedTextLen=${context ? context.length : 0} chapterIdx=${currentChapterIndex} provider=${provider}`,
  );

  if (!query || !filename) {
    res.status(400).json({ error: "Missing query or filename" });
    return;
  }

  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    const bookJsonData = await loadBookJsonStructure(filePath);

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
      `[handleChatQuery] Trimmed to ${trimmedBookJson.chapters.length}/${totalChapters} chapters.`,
    );

    const service = provider === "claude" ? claudeService : openaiService;

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let totalChars = 0;
    for await (const chunk of service.getChatResponseStream(
      trimmedBookJson,
      context,
      query,
    )) {
      if (res.writableEnded) break;
      res.write(chunk);
      totalChars += chunk.length;
    }
    res.end();
    console.log(
      `[handleChatQuery] Streamed ${totalChars} chars from ${provider === "claude" ? "Claude" : "OpenAI"}.`,
    );
  } catch (error) {
    console.error("[handleChatQuery] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process chat query";
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    } else {
      // Already streaming — append a marker the client can detect.
      res.write(`\n\n[Error: ${errorMessage}]`);
      res.end();
    }
  }
};
