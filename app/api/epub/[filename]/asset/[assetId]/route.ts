import { getAsset } from "@/lib/db/books";
import { AssetParams, parseOrError } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string; assetId: string }> },
): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await context.params;
  const validated = parseOrError(AssetParams, {
    filename: decodeURIComponent(params.filename),
    assetId: decodeURIComponent(params.assetId),
  });
  if (!validated.ok) return validated.response;
  const { filename, assetId } = validated.data;

  try {
    const asset = await getAsset(auth.userId, filename, assetId);
    if (!asset) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(asset.bytes), {
      status: 200,
      headers: {
        "Content-Type": asset.mime || "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error(`[GET asset ${assetId} of ${filename}]`, error);
    return new Response(null, { status: 404 });
  }
}
