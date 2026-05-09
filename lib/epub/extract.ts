import type { EPub, Metadata } from "epub";
import type { DbAsset, DbChapter } from "@/lib/db/books";
import { listChapterRefs } from "./toc";
import { buildHrefToId, rewriteImageSources, stripEpubStyles } from "./render";
import { sanitizeChapterHtml } from "./sanitize";

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
  const title =
    typeof md.title === "string" && md.title.trim() ? md.title : null;
  const creator =
    typeof md.creator === "string" && md.creator.trim() ? md.creator : null;
  return { title, author: creator };
}
