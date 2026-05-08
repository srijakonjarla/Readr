import { getChapter } from "@/lib/db/books";
import { ChapterParams, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string; chapterId: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(ChapterParams, {
    filename: decodeURIComponent(params.filename),
    chapterId: decodeURIComponent(params.chapterId),
  });
  if (!validated.ok) return validated.response;
  const { filename, chapterId } = validated.data;

  try {
    const chapter = await getChapter(filename, chapterId);
    if (!chapter) {
      return Response.json({ error: "Chapter not found" }, { status: 404 });
    }
    return new Response(chapter.html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error(`[GET chapter ${chapterId} of ${filename}]`, error);
    return Response.json(
      { error: `Failed to get chapter content for ID: ${chapterId}` },
      { status: 500 },
    );
  }
}
