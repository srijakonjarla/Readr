import { appendMessage, clearMessages } from "@/lib/db/threads";
import { MessageBody, ThreadIdParam, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await context.params;
  const idValidated = parseOrError(ThreadIdParam, {
    id: decodeURIComponent(params.id),
  });
  if (!idValidated.ok) return idValidated.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const msgValidated = parseOrError(MessageBody, body);
  if (!msgValidated.ok) return msgValidated.response;

  const msg = msgValidated.data;
  appendMessage(idValidated.data.id, {
    role: msg.role,
    text: msg.text,
    anchor: msg.anchor ?? false,
  });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await context.params;
  const validated = parseOrError(ThreadIdParam, {
    id: decodeURIComponent(params.id),
  });
  if (!validated.ok) return validated.response;
  clearMessages(validated.data.id);
  return new Response(null, { status: 204 });
}
