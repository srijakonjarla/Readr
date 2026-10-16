import { listHighlights } from "@/lib/db/highlights";
import { listThreads } from "@/lib/db/threads";
import { FileParams, parseOrError } from "@/lib/schemas";
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

  const [highlights, threads] = await Promise.all([
    listHighlights(auth.userId, filename),
    listThreads(auth.userId, filename),
  ]);
  return Response.json({ highlights, threads });
}
