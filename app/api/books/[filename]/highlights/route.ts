import { insertHighlight, type DbHighlight } from "@/lib/db/highlights";
import { FileParams, HighlightBody, parseOrError } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const params = await context.params;
  const fnameValidated = parseOrError(FileParams, {
    filename: decodeURIComponent(params.filename),
  });
  if (!fnameValidated.ok) return fnameValidated.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bodyValidated = parseOrError(HighlightBody, body);
  if (!bodyValidated.ok) return bodyValidated.response;

  const h: DbHighlight = {
    ...bodyValidated.data,
    filename: fnameValidated.data.filename,
  };
  await insertHighlight(h);
  return Response.json(h, { status: 201 });
}
