import { promises as fsp } from "node:fs";
import { EPub } from "epub";

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
