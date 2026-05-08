"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReaderSection from "@/components/ReaderSection";
import ChatPanel from "@/components/ChatPanel";
import {
  fetchBookState,
  persistClearMessages,
  persistHighlight,
  persistMessage,
  persistRemoveHighlight,
  persistRemoveLastMessage,
  persistThread,
} from "@/lib/persistence";
import type { Book, ChatMessage, Highlight, Thread } from "@/types";

export default function ReaderPage({
  params,
}: {
  params: Promise<{ filename: string }>;
}) {
  const { filename: encoded } = use(params);
  const filename = decodeURIComponent(encoded);
  const book: Book = { filename };
  const router = useRouter();

  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("main");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [readerChapterIndex, setReaderChapterIndex] = useState<number>(-1);

  // Load persisted state for this book on mount.
  useEffect(() => {
    let cancelled = false;
    fetchBookState(filename)
      .then((state) => {
        if (cancelled) return;
        setHighlights(state.highlights);
        const hasMain = state.threads.some((t) => t.id === "main");
        const mainThread: Thread = {
          id: "main",
          title: "General",
          anchor: null,
          chapterIndex: null,
          messages: [],
        };
        const merged = hasMain
          ? state.threads
          : [mainThread, ...state.threads];
        if (!hasMain) persistThread(filename, mainThread);
        setThreads(merged);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load persisted state:", err);
        const mainThread: Thread = {
          id: "main",
          title: "General",
          anchor: null,
          chapterIndex: null,
          messages: [],
        };
        persistThread(filename, mainThread);
        setThreads([mainThread]);
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  // ─── Highlight + thread mutations ────────────────────────────────────────
  const addHighlight = (h: Highlight): void => {
    setHighlights((prev) => [...prev, h]);
    persistHighlight(filename, h);
  };

  const removeHighlight = (id: string): void => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    persistRemoveHighlight(id);
  };

  const focusThread = (id: string): void => {
    setActiveThreadId(id);
    setChatOpen(true);
  };

  const startThreadFromSelection = (
    h: Highlight,
    chapterTitle: string,
    suggestedPrompt?: string,
  ): void => {
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
    setChatOpen(true);
    if (suggestedPrompt) setPendingPrompt(suggestedPrompt);
    void chapterTitle;
  };

  const clearThread = (threadId: string): void => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: [] } : t)),
    );
    persistClearMessages(threadId);
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

  const appendStreamingMessage = (
    threadId: string,
    msg: ChatMessage,
  ): void => {
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

  const commitStreamingMessage = (
    threadId: string,
    msg: ChatMessage,
  ): void => {
    persistMessage(threadId, msg);
  };

  const handleBackToLibrary = (): void => {
    setChatOpen(false);
    router.push("/");
  };

  return (
    <>
      <main
        style={{
          marginRight: chatOpen ? 420 : 0,
          transition: "margin-right .25s ease",
        }}
      >
        <ReaderSection
          book={book}
          onBackToLibrary={handleBackToLibrary}
          highlights={highlights}
          onAddHighlight={addHighlight}
          onRemoveHighlight={removeHighlight}
          onStartThread={startThreadFromSelection}
          onFocusThread={focusThread}
          onOpenChat={() => setChatOpen(true)}
          chatOpen={chatOpen}
          onChapterChange={setReaderChapterIndex}
        />
      </main>
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        book={book}
        threads={threads}
        activeThreadId={activeThreadId}
        onSwitchThread={setActiveThreadId}
        onAppendMessage={appendMessage}
        onAppendStreamingMessage={appendStreamingMessage}
        onUpdateStreamingText={updateStreamingText}
        onCommitStreamingMessage={commitStreamingMessage}
        onClearThread={clearThread}
        onRemoveLastMessage={removeLastMessage}
        pendingPrompt={pendingPrompt}
        clearPendingPrompt={() => setPendingPrompt(null)}
        currentChapterIndex={readerChapterIndex}
      />
    </>
  );
}
