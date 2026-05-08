import path from "node:path";
import fs from "node:fs";
import { loadEpub, UPLOADS_DIR } from "@/lib/epub";
import { AssetParams, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string; assetId: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(AssetParams, {
    filename: decodeURIComponent(params.filename),
    assetId: decodeURIComponent(params.assetId),
  });
  if (!validated.ok) return validated.response;
  const { filename, assetId } = validated.data;

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return new Response(null, { status: 404 });

  try {
    const epub = await loadEpub(filePath);
    let asset: { data: Buffer; mimeType: string };
    try {
      asset = await epub.getImage(assetId);
    } catch {
      asset = await epub.getFile(assetId);
    }
    return new Response(new Uint8Array(asset.data), {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error(`[GET asset ${assetId} of ${filename}]`, error);
    return new Response(null, { status: 404 });
  }
}
