import type { EPub } from "epub";

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
