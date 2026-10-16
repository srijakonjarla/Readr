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

export async function listThreads(
  userId: string,
  filename: string,
): Promise<DbThread[]> {
  const threadRows = await sql<ThreadRow[]>`
    SELECT * FROM threads
    WHERE user_id = ${userId} AND filename = ${filename} ORDER BY created_at
  `;
  if (threadRows.length === 0) return [];

  const messageRows = await sql<MessageRow[]>`
    SELECT m.* FROM messages m JOIN threads t ON m.thread_id = t.id
    WHERE t.user_id = ${userId} AND t.filename = ${filename}
    ORDER BY m.thread_id, m.id
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
  userId: string,
  t: Omit<DbThread, "messages">,
): Promise<void> {
  await sql`
    INSERT INTO threads (id, user_id, filename, title, anchor_text, chapter_index)
    VALUES (${t.id}, ${userId}, ${t.filename}, ${t.title}, ${t.anchor?.text ?? null}, ${t.chapterIndex})
  `;
}

export async function deleteThread(userId: string, id: string): Promise<void> {
  await sql`DELETE FROM threads WHERE user_id = ${userId} AND id = ${id}`;
}

// Messages have no owner column; every write goes through an ownership check
// on the parent thread.
async function ownsThread(userId: string, threadId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM threads WHERE user_id = ${userId} AND id = ${threadId}
  `;
  return rows.length > 0;
}

/** Returns false when the thread doesn't exist or isn't the user's. */
export async function appendMessage(
  userId: string,
  threadId: string,
  msg: DbMessage,
): Promise<boolean> {
  if (!(await ownsThread(userId, threadId))) return false;
  await sql`
    INSERT INTO messages (thread_id, role, text, anchor)
    VALUES (${threadId}, ${msg.role}, ${msg.text}, ${msg.anchor ? 1 : 0})
  `;
  return true;
}

export async function clearMessages(
  userId: string,
  threadId: string,
): Promise<void> {
  await sql`
    DELETE FROM messages m USING threads t
    WHERE m.thread_id = t.id AND t.user_id = ${userId} AND t.id = ${threadId}
  `;
}

export async function removeLastMessage(
  userId: string,
  threadId: string,
): Promise<void> {
  const rows = await sql<{ id: number }[]>`
    SELECT m.id FROM messages m JOIN threads t ON t.id = m.thread_id
    WHERE t.user_id = ${userId} AND t.id = ${threadId}
    ORDER BY m.id DESC LIMIT 1
  `;
  if (rows.length === 0) return;
  await sql`DELETE FROM messages WHERE id = ${rows[0].id}`;
}
