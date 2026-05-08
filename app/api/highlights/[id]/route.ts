import { deleteHighlight } from "@/lib/db/highlights";
import { HighlightIdParam, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(HighlightIdParam, {
    id: decodeURIComponent(params.id),
  });
  if (!validated.ok) return validated.response;
  deleteHighlight(validated.data.id);
  return new Response(null, { status: 204 });
}
