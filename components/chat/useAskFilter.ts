import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { Ask } from "./types";
import {
  clearHighlight,
  findTextRanges,
  paintHighlight,
} from "../../util/textSearch";

// Same matching rule as the in-DOM search: case-insensitive, whitespace
// ignored. Markdown punctuation is dropped so "**foo** bar" matches "foo bar".
const compact = (s: string): string =>
  s.replace(/[\s*_`#>~]+/g, "").toLowerCase();

/**
 * Filters a context's asks by a search query and paints matches inside the
 * scroll container. Each visible ask keeps its real index, so "is this the
 * last ask" checks (pending, regenerate) still work while filtered.
 */
export function useAskFilter(
  asks: Ask[],
  scrollRef: RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  const [query, setQuery] = useState<string>("");
  const needle = compact(query);

  const visibleAsks = useMemo(
    () =>
      asks
        .map((ask, index) => ({ ask, index }))
        .filter(
          ({ ask }) =>
            !needle ||
            compact(ask.question.text).includes(needle) ||
            compact(ask.answer?.text ?? "").includes(needle),
        ),
    [asks, needle],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !open || !needle) {
      clearHighlight("chat-match");
      return;
    }
    paintHighlight("chat-match", findTextRanges(root, query));
  }, [scrollRef, query, needle, visibleAsks, open]);

  useEffect(() => () => clearHighlight("chat-match"), []);

  return { query, setQuery, active: needle.length > 0, visibleAsks };
}
