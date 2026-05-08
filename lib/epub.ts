import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { EPub, type ManifestItem, type Metadata, type TocElement } from "epub";
import DOMPurify from "isomorphic-dompurify";
import type { BookChapter, BookJsonData } from "@/shared/api";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// ─── Parsed-EPUB LRU cache ──────────────────────────────────────────────────
// Parsing reads the entire EPUB zip and walks the manifest, which is too
// expensive to do on every chapter / asset / chat call. Cache the parsed
// EPub keyed by file path; invalidate when the underlying file changes
// (mtime) and evict the least-recently-used entry once we hit the cap.
const EPUB_CACHE_MAX = 5;
interface EpubCacheEntry {
  epub: EPub;
  mtimeMs: number;
}
// Hold the cache on globalThis so it survives Next dev hot reloads.
const globalForCache = globalThis as unknown as {
  __readrEpubCache?: Map<string, EpubCacheEntry>;
};
const epubCache: Map<string, EpubCacheEntry> =
  globalForCache.__readrEpubCache ??
  (globalForCache.__readrEpubCache = new Map());

async function parseEpubFresh(filePath: string, timeoutMs: number): Promise<EPub> {
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

export async function loadEpub(
  filePath: string,
  timeoutMs = 15_000,
): Promise<EPub> {
  const stat = await fsp.stat(filePath);
  const cached = epubCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    epubCache.delete(filePath);
    epubCache.set(filePath, cached);
    return cached.epub;
  }
  const epub = await parseEpubFresh(filePath, timeoutMs);
  epubCache.set(filePath, { epub, mtimeMs: stat.mtimeMs });
  while (epubCache.size > EPUB_CACHE_MAX) {
    const oldest = epubCache.keys().next().value;
    if (oldest === undefined) break;
    epubCache.delete(oldest);
  }
  return epub;
}

// ─── Title resolution ───────────────────────────────────────────────────────
function fallbackChapterTitle(
  item: ManifestItem | TocElement,
  index: number,
): string {
  const t = (item as Record<string, unknown>).title;
  return typeof t === "string" && t.trim() ? t : `Chapter ${index + 1}`;
}

interface TocTitleMaps {
  byId: Record<string, string>;
  byHref: Record<string, string>;
}

export function buildTocTitleMaps(epub: EPub): TocTitleMaps {
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

export function resolveChapterTitle(
  item: ManifestItem | TocElement,
  index: number,
  tocMaps: TocTitleMaps,
): string {
  if (typeof item.id === "string" && tocMaps.byId[item.id]) {
    return tocMaps.byId[item.id];
  }
  const href = typeof item.href === "string" ? item.href.split("#")[0] : "";
  if (href && tocMaps.byHref[href]) return tocMaps.byHref[href];
  const fname = href.split("/").pop();
  if (fname && tocMaps.byHref[fname]) return tocMaps.byHref[fname];
  return fallbackChapterTitle(item, index);
}

// ─── Chapter HTML pipeline ─────────────────────────────────────────────────
export function stripEpubStyles(html: string): string {
  return html
    .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
}

export function buildHrefToId(epub: EPub): Record<string, string> {
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

export function rewriteImageSources(
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

export function sanitizeChapterHtml(html: string): string {
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

// ─── Whole-book JSON for chat context ──────────────────────────────────────
const MAX_CHARS_PER_CHAPTER_JSON = 5000;

export async function loadBookJsonStructure(
  filePath: string,
): Promise<BookJsonData> {
  if (!fs.existsSync(filePath)) {
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

  if (chapterList.length === 0) return bookJson;

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
        return {
          id: chapterRef.id,
          title: fallbackTitle,
          content: null,
          error: message,
        };
      }
    },
  );

  bookJson.chapters = await Promise.all(chapterPromises);
  return bookJson;
}

export interface BookSummary {
  filename: string;
  metadata: Metadata;
}

export async function getEpubSummary(
  filePath: string,
  filename: string,
  timeoutMs = 15_000,
): Promise<BookSummary | null> {
  if (!fs.existsSync(filePath)) return null;
  try {
    const epub = await loadEpub(filePath, timeoutMs);
    return {
      filename,
      metadata: epub.metadata || ({ title: filename } as Metadata),
    };
  } catch (error) {
    const m = error instanceof Error ? error.message : String(error);
    console.error(`[getEpubSummary] ${filename}: ${m}`);
    return null;
  }
}
