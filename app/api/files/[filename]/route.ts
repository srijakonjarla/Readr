import path from "node:path";
import fs from "node:fs";
import type { ManifestItem, TocElement } from "epub";
import {
  buildTocTitleMaps,
  loadEpub,
  resolveChapterTitle,
  UPLOADS_DIR,
} from "@/lib/epub";
import { FileParams, parseOrError } from "@/lib/schemas";
import type { TocItem } from "@/shared/api";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(FileParams, {
    filename: decodeURIComponent(params.filename),
  });
  if (!validated.ok) return validated.response;
  const { filename } = validated.data;

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const epub = await loadEpub(filePath);
    const useFlow = epub.flow && epub.flow.length > 0;
    const chapterSource: Array<ManifestItem | TocElement> = useFlow
      ? epub.flow
      : epub.toc;

    let toc: TocItem[] = [];
    if (chapterSource && chapterSource.length > 0) {
      const tocMaps = buildTocTitleMaps(epub);
      toc = chapterSource.map((item, index) => ({
        id: item.id,
        href: item.href,
        title: resolveChapterTitle(item, index, tocMaps),
      }));
    }

    return Response.json({ metadata: epub.metadata, toc, filename });
  } catch (error) {
    console.error(`[GET /api/files/${filename}]`, error);
    return Response.json(
      { error: "Failed to parse EPUB file" },
      { status: 500 },
    );
  }
}
