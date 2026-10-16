// In-DOM text search, painted with the CSS Custom Highlight API so nothing is
// inserted into the DOM — the highlight painter's <mark>s and live text
// selections are left alone. Matching mirrors lib/search.ts (case-insensitive,
// whitespace ignored) so a server result's `occurrence` maps to the same Range.

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

export function findTextRanges(root: HTMLElement, query: string): Range[] {
  const needle = query.replace(/\s+/g, "").toLowerCase();
  if (!needle) return [];

  // One entry per non-whitespace character: its Text node and offset.
  const nodes: Text[] = [];
  const offsets: number[] = [];
  let compact = "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement && SKIP_TAGS.has(n.parentElement.tagName)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n as Text).data;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      nodes.push(n as Text);
      offsets.push(i);
      compact += text[i].toLowerCase();
    }
  }

  const ranges: Range[] = [];
  for (
    let at = compact.indexOf(needle);
    at !== -1;
    at = compact.indexOf(needle, at + needle.length)
  ) {
    const last = at + needle.length - 1;
    const range = document.createRange();
    range.setStart(nodes[at], offsets[at]);
    range.setEnd(nodes[last], offsets[last] + 1);
    ranges.push(range);
  }
  return ranges;
}

const supported = (): boolean =>
  typeof CSS !== "undefined" &&
  "highlights" in CSS &&
  typeof globalThis.Highlight === "function";

/** Paint `ranges` under a named highlight (styled via `::highlight(name)`). */
export function paintHighlight(name: string, ranges: Range[]): void {
  if (!supported()) return;
  if (ranges.length === 0) {
    CSS.highlights.delete(name);
    return;
  }
  CSS.highlights.set(name, new globalThis.Highlight(...ranges));
}

export function clearHighlight(name: string): void {
  if (supported()) CSS.highlights.delete(name);
}

/** Scroll the window so `range` sits roughly a third of the way down. */
export function scrollRangeIntoView(range: Range): void {
  const rect = range.getBoundingClientRect();
  window.scrollTo({
    top: window.scrollY + rect.top - window.innerHeight / 3,
    behavior: "smooth",
  });
}
