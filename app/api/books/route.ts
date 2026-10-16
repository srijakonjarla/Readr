import { listBooks } from "@/lib/db/books";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const books = await listBooks(auth.userId);
    return Response.json(
      books.map((b) => ({
        filename: b.filename,
        metadata: {
          title: b.title ?? b.filename,
          creator: b.author ?? "",
        },
      })),
    );
  } catch (error) {
    console.error("[GET /api/books]", error);
    return Response.json({ error: "Failed to list books" }, { status: 500 });
  }
}
