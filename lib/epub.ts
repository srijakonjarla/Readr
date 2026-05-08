import { promises as fsp } from "node:fs";
import { EPub, type ManifestItem, type Metadata, type TocElement } from "epub";
import DOMPurify from "isomorphic-dompurify";
import type { BookChapter, BookJsonData } from "@/shared/api";
import {
  getBook,
  listChapters,
  type DbAsset,
  type DbChapter,
} from "@/lib/db/books";

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

// ─── Upload-time extraction (parse EPUB → DB rows) ─────────────────────────

export interface ChapterRefForToc {
  id: string;
  href: string;
  title: string;
}

export function listChapterRefs(epub: EPub): ChapterRefForToc[] {
  const useFlow = epub.flow && epub.flow.length > 0;
  const source: Array<ManifestItem | TocElement> = useFlow
    ? epub.flow
    : epub.toc || [];
  if (source.length === 0) return [];
  const tocMaps = buildTocTitleMaps(epub);
  return source.map((item, index) => ({
    id: item.id,
    href: typeof item.href === "string" ? item.href : "",
    title: resolveChapterTitle(item, index, tocMaps),
  }));
}

export async function extractChaptersForUpload(
  epub: EPub,
  filename: string,
): Promise<DbChapter[]> {
  const refs = listChapterRefs(epub);
  if (refs.length === 0) return [];
  const hrefToId = buildHrefToId(epub);
  const chapters: DbChapter[] = [];
  // Dedupe by chapter_id — some EPUBs have multiple TOC entries pointing at
  // the same XHTML file (different #anchors); they'd otherwise collide on the
  // (filename, chapter_id) primary key.
  const seen = new Set<string>();
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    let html = "";
    try {
      const raw = await epub.getChapter(ref.id);
      const stripped = stripEpubStyles(raw || "");
      const rewritten = rewriteImageSources(stripped, hrefToId, filename);
      html = sanitizeChapterHtml(rewritten);
    } catch (error) {
      console.error(`[extractChaptersForUpload] ${ref.id}:`, error);
    }
    chapters.push({
      filename,
      chapterId: ref.id,
      idx: chapters.length,
      title: ref.title,
      html,
    });
  }
  return chapters;
}

export async function extractAssetsForUpload(
  epub: EPub,
  filename: string,
): Promise<DbAsset[]> {
  const assets: DbAsset[] = [];
  for (const id of Object.keys(epub.manifest)) {
    const item = epub.manifest[id];
    const media =
      (item as { mediaType?: string; "media-type"?: string }).mediaType ??
      (item as { mediaType?: string; "media-type"?: string })["media-type"];
    if (typeof media !== "string" || !media.startsWith("image/")) continue;
    try {
      const { data, mimeType } = await epub.getImage(id);
      assets.push({
        filename,
        assetId: id,
        mime: mimeType || media,
        bytes: data,
      });
    } catch (error) {
      console.error(`[extractAssetsForUpload] ${id}:`, error);
    }
  }
  return assets;
}

export function readEpubMetadata(epub: EPub): {
  title: string | null;
  author: string | null;
} {
  const md = epub.metadata || ({} as Metadata);
  const title = typeof md.title === "string" && md.title.trim() ? md.title : null;
  const creator =
    typeof md.creator === "string" && md.creator.trim() ? md.creator : null;
  return { title, author: creator };
}

// ─── Whole-book JSON for chat context (DB-backed) ──────────────────────────
const MAX_CHARS_PER_CHAPTER_JSON = 5000;

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
