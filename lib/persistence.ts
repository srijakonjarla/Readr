import type { ChatMessage, Highlight, Thread } from "@/types";

interface BookState {
  highlights: Highlight[];
  threads: Thread[];
}

const log = (action: string, error: unknown): void => {
  console.warn(`[persistence:${action}]`, error);
};

export async function fetchBookState(filename: string): Promise<BookState> {
  const res = await fetch(
    `/api/books/${encodeURIComponent(filename)}/state`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fire-and-forget mutations — UI updates optimistically; persistence is best-effort.

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
  void fetch(`/api/books/${encodeURIComponent(filename)}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: t.id,
      title: t.title,
      anchor: t.anchor,
      chapterIndex: t.chapterIndex,
    }),
  }).catch((e) => log("createThread", e));
}

export function persistMessage(threadId: string, msg: ChatMessage): void {
  void fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: msg.role,
      text: msg.text,
      anchor: msg.anchor ?? false,
    }),
  }).catch((e) => log("appendMessage", e));
}

export function persistClearMessages(threadId: string): void {
  void fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "DELETE",
  }).catch((e) => log("clearMessages", e));
}

export function persistRemoveLastMessage(threadId: string): void {
  void fetch(`/api/threads/${encodeURIComponent(threadId)}/messages/last`, {
    method: "DELETE",
  }).catch((e) => log("removeLastMessage", e));
}

export function persistDeleteThread(threadId: string): void {
  void fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  }).catch((e) => log("deleteThread", e));
}
