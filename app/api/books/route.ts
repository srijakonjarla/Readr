import { listBooks } from "@/lib/db/books";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const books = await listBooks();
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
