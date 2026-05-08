import path from "node:path";
import fs from "node:fs";
import {
  buildHrefToId,
  loadEpub,
  rewriteImageSources,
  sanitizeChapterHtml,
  stripEpubStyles,
  UPLOADS_DIR,
} from "@/lib/epub";
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

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const epub = await loadEpub(filePath);
    const rawText = await epub.getChapter(chapterId);
    const stripped = stripEpubStyles(rawText || "");
    const hrefToId = buildHrefToId(epub);
    const rewritten = rewriteImageSources(stripped, hrefToId, filename);
    const text = sanitizeChapterHtml(rewritten);
    return new Response(text, {
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
