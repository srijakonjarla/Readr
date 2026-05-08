import { db } from "./index";

export interface DbMessage {
  role: "user" | "assistant";
  text: string;
  anchor: boolean;
}

export interface DbThread {
  id: string;
  filename: string;
  title: string;
  anchor: { text: string } | null;
  chapterIndex: number | null;
  messages: DbMessage[];
}

interface ThreadRow {
  id: string;
  filename: string;
  title: string;
  anchor_text: string | null;
  chapter_index: number | null;
}

interface MessageRow {
  id: number;
  thread_id: string;
  role: string;
  text: string;
  anchor: number;
}

const rowToThread = (r: ThreadRow, messages: DbMessage[]): DbThread => ({
  id: r.id,
  filename: r.filename,
  title: r.title,
  anchor: r.anchor_text ? { text: r.anchor_text } : null,
  chapterIndex: r.chapter_index,
  messages,
});

const rowToMessage = (r: MessageRow): DbMessage => ({
  role: r.role === "assistant" ? "assistant" : "user",
  text: r.text,
  anchor: r.anchor === 1,
});

export function listThreads(filename: string): DbThread[] {
  const threadRows = db
    .prepare(
      "SELECT * FROM threads WHERE filename = ? ORDER BY created_at",
    )
    .all(filename) as unknown as ThreadRow[];
  if (threadRows.length === 0) return [];

  const messageRows = db
    .prepare(
      `SELECT m.* FROM messages m JOIN threads t ON m.thread_id = t.id
       WHERE t.filename = ? ORDER BY m.thread_id, m.id`,
    )
    .all(filename) as unknown as MessageRow[];

  const messagesByThread = new Map<string, DbMessage[]>();
  for (const m of messageRows) {
    const list = messagesByThread.get(m.thread_id) ?? [];
    list.push(rowToMessage(m));
    messagesByThread.set(m.thread_id, list);
  }

  return threadRows.map((r) =>
    rowToThread(r, messagesByThread.get(r.id) ?? []),
  );
}

export function insertThread(t: Omit<DbThread, "messages">): void {
  db.prepare(
    `INSERT INTO threads (id, filename, title, anchor_text, chapter_index)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(t.id, t.filename, t.title, t.anchor?.text ?? null, t.chapterIndex);
}

export function deleteThread(id: string): void {
  db.prepare("DELETE FROM threads WHERE id = ?").run(id);
}

export function appendMessage(threadId: string, msg: DbMessage): void {
  db.prepare(
    `INSERT INTO messages (thread_id, role, text, anchor)
     VALUES (?, ?, ?, ?)`,
  ).run(threadId, msg.role, msg.text, msg.anchor ? 1 : 0);
}

export function clearMessages(threadId: string): void {
  db.prepare("DELETE FROM messages WHERE thread_id = ?").run(threadId);
}

export function removeLastMessage(threadId: string): void {
  const row = db
    .prepare(
      "SELECT id FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1",
    )
    .get(threadId) as unknown as { id: number } | undefined;
  if (!row) return;
  db.prepare("DELETE FROM messages WHERE id = ?").run(row.id);
}
