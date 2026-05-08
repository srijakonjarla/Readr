import { db } from "./index";

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

export function listHighlights(filename: string): DbHighlight[] {
  const stmt = db.prepare(
    "SELECT * FROM highlights WHERE filename = ? ORDER BY created_at",
  );
  return (stmt.all(filename) as unknown as Row[]).map(rowToHighlight);
}

export function insertHighlight(h: DbHighlight): void {
  db.prepare(
    `INSERT INTO highlights (id, filename, kind, chapter_id, chapter_index, text, thread_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    h.id,
    h.filename,
    h.kind,
    h.chapterId,
    h.chapterIndex,
    h.text,
    h.threadCount ?? null,
  );
}

export function updateHighlightKind(
  id: string,
  kind: "highlight" | "thread",
): void {
  db.prepare("UPDATE highlights SET kind = ? WHERE id = ?").run(kind, id);
}

export function deleteHighlight(id: string): void {
  db.prepare("DELETE FROM highlights WHERE id = ?").run(id);
}
