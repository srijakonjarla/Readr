import { deleteThread } from "@/lib/db/threads";
import { ThreadIdParam, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(ThreadIdParam, {
    id: decodeURIComponent(params.id),
  });
  if (!validated.ok) return validated.response;
  await deleteThread(validated.data.id);
  return new Response(null, { status: 204 });
}
