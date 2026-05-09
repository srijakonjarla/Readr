import sanitizeHtml from "sanitize-html";

// Sanitize chapter HTML for safe rendering. Allowlist the semantic tags an
// EPUB body may contain (paragraphs, headings, lists, tables, images, links,
// inline emphasis, etc.) and strip everything else — including scripts,
// iframes, forms, and any on* event-handler attributes.
const ALLOWED_TAGS: string[] = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "figure",
  "figcaption",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "main",
  "nav",
  "small",
  "sub",
  "sup",
  "u",
  "s",
  "strike",
  "mark",
  "details",
  "summary",
];

export function sanitizeChapterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["id", "class", "title", "lang", "dir"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan", "align", "valign"],
      th: ["colspan", "rowspan", "align", "valign", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}
