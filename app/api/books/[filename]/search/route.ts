import { getBook, listChapters } from "@/lib/db/books";
import { FileParams, SearchQuery, parseOrError } from "@/lib/schemas";
import { findMatches, htmlToText } from "@/lib/search";
import { requireUser } from "@/lib/auth";
import type { BookSearchChapter, BookSearchResponse } from "@/shared/api";

export const runtime = "nodejs";

// Per-chapter snippet cap; `total` still counts every match.
const MAX_MATCHES_PER_CHAPTER = 20;

export async function GET(
  req: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await context.params;
  const fnameValidated = parseOrError(FileParams, {
    filename: decodeURIComponent(params.filename),
  });
  if (!fnameValidated.ok) return fnameValidated.response;
  const url = new URL(req.url);
  const queryValidated = parseOrError(SearchQuery, {
    q: url.searchParams.get("q") ?? "",
    through: url.searchParams.get("through") ?? undefined,
  });
  if (!queryValidated.ok) return queryValidated.response;
  const { filename } = fnameValidated.data;
  const { q, through } = queryValidated.data;

  try {
    if (!(await getBook(auth.userId, filename))) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
    const chapters = await listChapters(auth.userId, filename);
    const results: BookSearchChapter[] = [];
    let total = 0;
    chapters.forEach((c, i) => {
      const ahead = through !== undefined && i > through;
      const found = findMatches(
        htmlToText(c.html),
        q,
        ahead ? 0 : MAX_MATCHES_PER_CHAPTER,
      );
      if (found.total === 0) return;
      total += found.total;
      results.push({
        chapterIndex: i,
        chapterId: c.chapterId,
        title: c.title ?? `Chapter ${i + 1}`,
        total: found.total,
        ahead,
        matches: found.matches,
      });
    });
    const body: BookSearchResponse = { query: q, total, chapters: results };
    return Response.json(body);
  } catch (error) {
    console.error(`[GET /api/books/${filename}/search]`, error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
