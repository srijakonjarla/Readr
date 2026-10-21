"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import ReaderSection from "@/components/ReaderSection";
import ChatPanel from "@/components/ChatPanel";
import { useBookState } from "@/hooks/useBookState";
import type { Book, Highlight } from "@/types";

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
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [readerChapterIndex, setReaderChapterIndex] = useState<number>(-1);
  const {
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
  } = useBookState(filename);

  const focusThread = (id: string): void => {
    setActiveThreadId(id);
    setChatOpen(true);
  };

  const startThreadFromSelection = (
    h: Highlight,
    _chapterTitle: string,
    suggestedPrompt?: string,
  ): void => {
    startThread(h);
    setChatOpen(true);
    if (suggestedPrompt) setPendingPrompt(suggestedPrompt);
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
        onDeleteThread={removeThread}
        onRemoveLastMessage={removeLastMessage}
        pendingPrompt={pendingPrompt}
        clearPendingPrompt={() => setPendingPrompt(null)}
        currentChapterIndex={readerChapterIndex}
      />
    </>
  );
}
