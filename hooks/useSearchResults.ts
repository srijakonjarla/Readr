import { useEffect, useState } from "react";
import type { BookSearchResponse } from "../shared/api";

export const MIN_SEARCH_QUERY = 2;
const DEBOUNCE_MS = 250;

/**
 * Debounced whole-book search. `through` is the reader's chapter: the server
 * withholds snippets for chapters past it. Stale requests are aborted.
 */
export function useSearchResults(
  filename: string,
  query: string,
  through: number,
) {
  const [result, setResult] = useState<BookSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < MIN_SEARCH_QUERY) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          through: String(through),
        });
        const res = await fetch(
          `/api/books/${encodeURIComponent(filename)}/search?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setResult(await res.json());
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, filename, through]);

  return { result, loading, error, ready: trimmed.length >= MIN_SEARCH_QUERY };
}
