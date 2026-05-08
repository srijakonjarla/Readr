import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { put } from "@vercel/blob";
import {
  extractAssetsForUpload,
  extractChaptersForUpload,
  loadEpub,
  readEpubMetadata,
} from "@/lib/epub";
import {
  insertAssets,
  insertBook,
  insertChapters,
} from "@/lib/db/books";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!/\.epub$/i.test(file.name)) {
    return Response.json(
      { error: "Only .epub files are accepted" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `File too large (max ${MAX_BYTES} bytes)` },
      { status: 413 },
    );
  }

  const safeName = file.name.replace(/[\\/]/g, "_").replace(/\0/g, "");
  const stored = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // The `epub` parser only accepts a file path, so stage the buffer in /tmp
  // for the duration of the upload, parse there, and clean up.
  const tmpPath = path.join(os.tmpdir(), stored);
  await fs.writeFile(tmpPath, buffer);

  try {
    const epub = await loadEpub(tmpPath);
    const { title, author } = readEpubMetadata(epub);
    const [chapters, assets] = await Promise.all([
      extractChaptersForUpload(epub, stored),
      extractAssetsForUpload(epub, stored),
    ]);

    const blob = await put(stored, buffer, {
      access: "private",
      contentType: "application/epub+zip",
    });

    await insertBook({
      filename: stored,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      title,
      author,
      sizeBytes: buffer.byteLength,
    });
    await insertChapters(chapters);
    await insertAssets(assets);

    return Response.json({
      message: "File uploaded successfully",
      file: stored,
      chapters: chapters.length,
      assets: assets.length,
    });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}
