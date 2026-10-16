import { removeLastMessage } from "@/lib/db/threads";
import { ThreadIdParam, parseOrError } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await context.params;
  const validated = parseOrError(ThreadIdParam, {
    id: decodeURIComponent(params.id),
  });
  if (!validated.ok) return validated.response;
  await removeLastMessage(auth.userId, validated.data.id);
  return new Response(null, { status: 204 });
}
