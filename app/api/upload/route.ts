import path from "node:path";
import { promises as fs } from "node:fs";
import { UPLOADS_DIR } from "@/lib/epub";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// Accept multipart/form-data with a `file` field (matches the legacy
// multer-based contract). Stores under uploads/ with a timestamp prefix.
export async function POST(req: Request): Promise<Response> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

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

  // Sanitize the original filename — strip path separators and any embedded
  // null bytes the browser might preserve from a hostile filesystem.
  const safeName = file.name.replace(/[\\/]/g, "_").replace(/\0/g, "");
  const stored = `${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, stored), buffer);

  return Response.json({
    message: "File uploaded successfully",
    file: stored,
  });
}
