import { listHighlights } from "@/lib/db/highlights";
import { listThreads } from "@/lib/db/threads";
import { FileParams, parseOrError } from "@/lib/schemas";

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

  const [highlights, threads] = await Promise.all([
    listHighlights(filename),
    listThreads(filename),
  ]);
  return Response.json({ highlights, threads });
}
