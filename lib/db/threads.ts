import { sql } from "./index";

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

export async function listThreads(filename: string): Promise<DbThread[]> {
  const threadRows = await sql<ThreadRow[]>`
    SELECT * FROM threads WHERE filename = ${filename} ORDER BY created_at
  `;
  if (threadRows.length === 0) return [];

  const messageRows = await sql<MessageRow[]>`
    SELECT m.* FROM messages m JOIN threads t ON m.thread_id = t.id
    WHERE t.filename = ${filename} ORDER BY m.thread_id, m.id
  `;

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

export async function insertThread(
  t: Omit<DbThread, "messages">,
): Promise<void> {
  await sql`
    INSERT INTO threads (id, filename, title, anchor_text, chapter_index)
    VALUES (${t.id}, ${t.filename}, ${t.title}, ${t.anchor?.text ?? null}, ${t.chapterIndex})
  `;
}

export async function deleteThread(id: string): Promise<void> {
  await sql`DELETE FROM threads WHERE id = ${id}`;
}

export async function appendMessage(
  threadId: string,
  msg: DbMessage,
): Promise<void> {
  await sql`
    INSERT INTO messages (thread_id, role, text, anchor)
    VALUES (${threadId}, ${msg.role}, ${msg.text}, ${msg.anchor ? 1 : 0})
  `;
}

export async function clearMessages(threadId: string): Promise<void> {
  await sql`DELETE FROM messages WHERE thread_id = ${threadId}`;
}

export async function removeLastMessage(threadId: string): Promise<void> {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM messages WHERE thread_id = ${threadId}
    ORDER BY id DESC LIMIT 1
  `;
  if (rows.length === 0) return;
  await sql`DELETE FROM messages WHERE id = ${rows[0].id}`;
}
