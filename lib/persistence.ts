import type { ChatMessage, Highlight, Thread } from "@/types";

interface BookState {
  highlights: Highlight[];
  threads: Thread[];
}

const log = (action: string, error: unknown): void => {
  console.warn(`[persistence:${action}]`, error);
};

export async function fetchBookState(filename: string): Promise<BookState> {
  const res = await fetch(`/api/books/${encodeURIComponent(filename)}/state`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fire-and-forget mutations — UI updates optimistically; persistence is best-effort.

// Writes to one thread run strictly in order. Otherwise a message can reach
// the server before its thread exists (and be rejected), or a regenerate's
// "delete last" can land after the new reply and delete that instead.
const threadQueues = new Map<string, Promise<void>>();

function enqueue(
  threadId: string,
  action: string,
  send: () => Promise<Response>,
): void {
  const prev = threadQueues.get(threadId) ?? Promise.resolve();
  const next = prev.then(async () => {
    try {
      const res = await send();
      if (!res.ok) log(action, `HTTP ${res.status}`);
    } catch (e) {
      log(action, e);
    }
  });
  threadQueues.set(threadId, next);
}

export function persistHighlight(filename: string, h: Highlight): void {
  void fetch(`/api/books/${encodeURIComponent(filename)}/highlights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(h),
  }).catch((e) => log("createHighlight", e));
}

export function persistRemoveHighlight(id: string): void {
  void fetch(`/api/highlights/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch((e) => log("deleteHighlight", e));
}

export function persistThread(filename: string, t: Thread): void {
  // Server expects { id, title, anchor, chapterIndex } — messages persisted separately
  enqueue(t.id, "createThread", () =>
    fetch(`/api/books/${encodeURIComponent(filename)}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: t.id,
        title: t.title,
        anchor: t.anchor,
        chapterIndex: t.chapterIndex,
      }),
    }),
  );
}

export function persistMessage(threadId: string, msg: ChatMessage): void {
  enqueue(threadId, "appendMessage", () =>
    fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: msg.role,
        text: msg.text,
        anchor: msg.anchor ?? false,
      }),
    }),
  );
}

export function persistClearMessages(threadId: string): void {
  enqueue(threadId, "clearMessages", () =>
    fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`, {
      method: "DELETE",
    }),
  );
}

export function persistRemoveLastMessage(threadId: string): void {
  enqueue(threadId, "removeLastMessage", () =>
    fetch(`/api/threads/${encodeURIComponent(threadId)}/messages/last`, {
      method: "DELETE",
    }),
  );
}

export function persistDeleteThread(threadId: string): void {
  enqueue(threadId, "deleteThread", () =>
    fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
      method: "DELETE",
    }),
  );
}
