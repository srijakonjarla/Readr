import { promises as fs } from "node:fs";
import { getEpubSummary, UPLOADS_DIR } from "@/lib/epub";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const files = await fs.readdir(UPLOADS_DIR);
    const epubFiles = files.filter((f) => f.toLowerCase().endsWith(".epub"));

    if (epubFiles.length === 0) {
      return Response.json([]);
    }

    const summaries = await Promise.all(
      epubFiles.map((fname) =>
        getEpubSummary(`${UPLOADS_DIR}/${fname}`, fname),
      ),
    );
    const valid = summaries.filter(
      (b): b is NonNullable<typeof b> => b !== null,
    );
    return Response.json(valid);
  } catch (error) {
    console.error("[GET /api/books]", error);
    return Response.json({ error: "Failed to list books" }, { status: 500 });
  }
}
