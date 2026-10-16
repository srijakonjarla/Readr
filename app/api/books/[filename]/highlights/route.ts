import { getBook } from "@/lib/db/books";
import { insertHighlight, type DbHighlight } from "@/lib/db/highlights";
import { FileParams, HighlightBody, parseOrError } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = await context.params;
  const fnameValidated = parseOrError(FileParams, {
    filename: decodeURIComponent(params.filename),
  });
  if (!fnameValidated.ok) return fnameValidated.response;
  if (!(await getBook(auth.userId, fnameValidated.data.filename))) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

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
  await insertHighlight(auth.userId, h);
  return Response.json(h, { status: 201 });
}
