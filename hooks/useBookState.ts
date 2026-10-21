import { useEffect, useState } from "react";
import {
  fetchBookState,
  persistClearMessages,
  persistDeleteThread,
  persistHighlight,
  persistMessage,
  persistRemoveHighlight,
  persistRemoveLastMessage,
  persistThread,
} from "../lib/persistence";
import type { ChatMessage, Highlight, Thread } from "../types";

const isGeneral = (t: Thread): boolean => t.anchor === null;

/**
 * A book's highlights and chat threads: loaded on mount, updated
 * optimistically, and persisted in the background.
 */
export function useBookState(filename: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");

  // Load persisted state for this book on mount. The General thread is the
  // one with no anchor; thread ids are globally unique, so each book gets its
  // own generated id rather than a shared constant.
  useEffect(() => {
    let cancelled = false;
    const withGeneral = (loaded: Thread[]): Thread[] => {
      const existing = loaded.find(isGeneral);
      if (existing) {
        return [existing, ...loaded.filter((t) => t !== existing)];
      }
      const general: Thread = {
        id: `general-${crypto.randomUUID()}`,
        title: "General",
        anchor: null,
        chapterIndex: null,
        messages: [],
      };
      persistThread(filename, general);
      return [general, ...loaded];
    };
    fetchBookState(filename)
      .then((state) => {
        if (cancelled) return;
        setHighlights(state.highlights);
        const merged = withGeneral(state.threads);
        setThreads(merged);
        setActiveThreadId(merged[0].id);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load persisted state:", err);
        const merged = withGeneral([]);
        setThreads(merged);
        setActiveThreadId(merged[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  const addHighlight = (h: Highlight): void => {
    setHighlights((prev) => [...prev, h]);
    persistHighlight(filename, h);
  };

  const removeHighlight = (id: string): void => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    persistRemoveHighlight(id);
  };

  // Promote a highlight to an anchored thread and make it active.
  const startThread = (h: Highlight): void => {
    const thread: Thread = {
      id: h.id,
      title:
        'on "' + h.text.slice(0, 22) + (h.text.length > 22 ? "…" : "") + '"',
      anchor: { text: h.text },
      chapterIndex: h.chapterIndex,
      messages: [],
    };
    const promotedHighlight: Highlight = { ...h, kind: "thread" };
    setHighlights((prev) => [...prev, promotedHighlight]);
    setThreads((prev) => [...prev, thread]);
    persistHighlight(filename, promotedHighlight);
    persistThread(filename, thread);
    setActiveThreadId(h.id);
  };

  const clearThread = (threadId: string): void => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: [] } : t)),
    );
    persistClearMessages(threadId);
  };

  const removeThread = (threadId: string): void => {
    const target = threads.find((t) => t.id === threadId);
    if (!target || isGeneral(target)) return;
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    // Threads created from a highlight share id with the highlight; remove
    // both so the chapter's anchor mark goes away too.
    setHighlights((prev) => prev.filter((h) => h.id !== threadId));
    persistDeleteThread(threadId);
    persistRemoveHighlight(threadId);
    if (activeThreadId === threadId) {
      setActiveThreadId(threads.find(isGeneral)?.id ?? "");
    }
  };

  const removeLastMessage = (threadId: string): void => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.slice(0, -1) } : t,
      ),
    );
    persistRemoveLastMessage(threadId);
  };

  const appendMessage = (threadId: string, msg: ChatMessage): void => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t,
      ),
    );
    persistMessage(threadId, msg);
  };

  const appendStreamingMessage = (threadId: string, msg: ChatMessage): void => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t,
      ),
    );
  };

  const updateStreamingText = (threadId: string, fullText: string): void => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        if (t.messages.length === 0) return t;
        const next = [...t.messages];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, text: fullText };
        return { ...t, messages: next };
      }),
    );
  };

  const commitStreamingMessage = (threadId: string, msg: ChatMessage): void => {
    persistMessage(threadId, msg);
  };

  return {
    highlights,
    threads,
    activeThreadId,
    setActiveThreadId,
    addHighlight,
    removeHighlight,
    startThread,
    clearThread,
    removeThread,
    removeLastMessage,
    appendMessage,
    appendStreamingMessage,
    updateStreamingText,
    commitStreamingMessage,
  };
}
