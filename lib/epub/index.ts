// Barrel re-export — keeps `@/lib/epub` import path stable for callers.
export { loadEpub } from "./cache";
export {
  buildTocTitleMaps,
  resolveChapterTitle,
  listChapterRefs,
  type ChapterRefForToc,
} from "./toc";
export { stripEpubStyles, buildHrefToId, rewriteImageSources } from "./render";
export { sanitizeChapterHtml } from "./sanitize";
export {
  extractChaptersForUpload,
  extractAssetsForUpload,
  readEpubMetadata,
} from "./extract";
export { loadBookJsonFromDb } from "./loadJson";
