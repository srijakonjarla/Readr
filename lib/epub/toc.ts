import type { EPub, ManifestItem, TocElement } from "epub";

interface TocTitleMaps {
  byId: Record<string, string>;
  byHref: Record<string, string>;
}

export interface ChapterRefForToc {
  id: string;
  href: string;
  title: string;
}

function fallbackChapterTitle(
  item: ManifestItem | TocElement,
  index: number,
): string {
  const t = (item as Record<string, unknown>).title;
  return typeof t === "string" && t.trim() ? t : `Chapter ${index + 1}`;
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
