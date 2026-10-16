/**
 * Full-text search over chapter HTML.
 *
 * Matching is case-insensitive and ignores whitespace entirely, so "foo bar"
 * matches across tag boundaries and line breaks. The client
 * (`util/textSearch.ts`) runs the same match against the rendered chapter
 * DOM, so `occurrence` indexes line up and a result can be scrolled to.
 */

export interface SearchMatch {
  /** 0-based index of this match among all matches in its chapter. */
  occurrence: number;
  before: string;
  match: string;
  after: string;
}

const SNIPPET_CONTEXT = 60;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// EPUB chapters are XHTML, which only predefines the five XML entities —
// everything else arrives as a numeric reference.
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code =
        ref[1] === "x" || ref[1] === "X"
          ? Number.parseInt(ref.slice(2), 16)
          : Number.parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

/** Readable plain text of a chapter: tags become spaces, whitespace collapsed. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export const compactQuery = (q: string): string =>
  q.replace(/\s+/g, "").toLowerCase();

export function findMatches(
  text: string,
  query: string,
  limit: number,
): { matches: SearchMatch[]; total: number } {
  const needle = compactQuery(query);
  if (!needle) return { matches: [], total: 0 };

  // Whitespace-free, lowercased copy plus a map back into `text`.
  const positions: number[] = [];
  let compact = "";
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      positions.push(i);
      compact += text[i].toLowerCase();
    }
  }

  const matches: SearchMatch[] = [];
  let total = 0;
  for (
    let at = compact.indexOf(needle);
    at !== -1;
    at = compact.indexOf(needle, at + needle.length)
  ) {
    if (matches.length < limit) {
      const start = positions[at];
      const end = positions[at + needle.length - 1] + 1;
      const from = Math.max(0, start - SNIPPET_CONTEXT);
      const to = Math.min(text.length, end + SNIPPET_CONTEXT);
      matches.push({
        occurrence: total,
        before: (from > 0 ? "…" : "") + text.slice(from, start),
        match: text.slice(start, end),
        after: text.slice(end, to) + (to < text.length ? "…" : ""),
      });
    }
    total++;
  }
  return { matches, total };
}
