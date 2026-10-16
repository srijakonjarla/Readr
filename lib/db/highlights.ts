import { sql } from "./index";

export interface DbHighlight {
  id: string;
  filename: string;
  kind: "highlight" | "thread";
  chapterId: string;
  chapterIndex: number;
  text: string;
  threadCount?: number;
}

interface Row {
  id: string;
  filename: string;
  kind: string;
  chapter_id: string;
  chapter_index: number;
  text: string;
  thread_count: number | null;
}

const rowToHighlight = (r: Row): DbHighlight => ({
  id: r.id,
  filename: r.filename,
  kind: r.kind === "thread" ? "thread" : "highlight",
  chapterId: r.chapter_id,
  chapterIndex: r.chapter_index,
  text: r.text,
  threadCount: r.thread_count ?? undefined,
});

export async function listHighlights(
  userId: string,
  filename: string,
): Promise<DbHighlight[]> {
  const rows = await sql<Row[]>`
    SELECT * FROM highlights
    WHERE user_id = ${userId} AND filename = ${filename} ORDER BY created_at
  `;
  return rows.map(rowToHighlight);
}

export async function insertHighlight(
  userId: string,
  h: DbHighlight,
): Promise<void> {
  await sql`
    INSERT INTO highlights (id, user_id, filename, kind, chapter_id, chapter_index, text, thread_count)
    VALUES (${h.id}, ${userId}, ${h.filename}, ${h.kind}, ${h.chapterId}, ${h.chapterIndex}, ${h.text}, ${h.threadCount ?? null})
  `;
}

export async function deleteHighlight(
  userId: string,
  id: string,
): Promise<void> {
  await sql`DELETE FROM highlights WHERE user_id = ${userId} AND id = ${id}`;
}
