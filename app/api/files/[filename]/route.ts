import { getBook, listChapters } from "@/lib/db/books";
import { FileParams, parseOrError } from "@/lib/schemas";
import type { TocItem } from "@/shared/api";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await context.params;
  const validated = parseOrError(FileParams, {
    filename: decodeURIComponent(params.filename),
  });
  if (!validated.ok) return validated.response;
  const { filename } = validated.data;

  try {
    const [book, chapters] = await Promise.all([
      getBook(auth.userId, filename),
      listChapters(auth.userId, filename),
    ]);
    if (!book) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }
    const toc: TocItem[] = chapters.map((c) => ({
      id: c.chapterId,
      href: "",
      title: c.title ?? `Chapter ${c.idx + 1}`,
    }));
    return Response.json({
      metadata: {
        title: book.title ?? filename,
        creator: book.author ?? "",
      },
      toc,
      filename,
    });
  } catch (error) {
    console.error(`[GET /api/files/${filename}]`, error);
    return Response.json({ error: "Failed to load book" }, { status: 500 });
  }
}
