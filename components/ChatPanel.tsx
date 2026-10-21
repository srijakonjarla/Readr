"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Book, ChatMessage, Thread } from "../types";
import { groupAsks } from "./chat/types";
import { Greeting } from "./chat/Greeting";
import { AskCard, PendingAsk } from "./chat/AskCard";
import { useChatStream } from "./chat/useChatStream";
import { useAskFilter } from "./chat/useAskFilter";
import ChatHeader from "./chat/ChatHeader";
import ChatToolbar from "./chat/ChatToolbar";
import ProviderToggle from "./chat/ProviderToggle";
import ContextTabs from "./chat/ContextTabs";
import Composer from "./chat/Composer";
import { ChatSkeleton } from "./Skeleton";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  book: Book;
  threads: Thread[];
  activeThreadId: string;
  onSwitchThread: (id: string) => void;
  onAppendMessage: (threadId: string, msg: ChatMessage) => void;
  onAppendStreamingMessage: (threadId: string, msg: ChatMessage) => void;
  onUpdateStreamingText: (threadId: string, fullText: string) => void;
  onCommitStreamingMessage: (threadId: string, msg: ChatMessage) => void;
  onClearThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onRemoveLastMessage: (threadId: string) => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;
  /** Current chapter the reader is on; used as the spoiler cutoff for un-anchored asks. */
  currentChapterIndex: number;
}

function ChatPanel({
  open,
  onClose,
  book,
  threads,
  activeThreadId,
  onSwitchThread,
  onAppendMessage,
  onAppendStreamingMessage,
  onUpdateStreamingText,
  onCommitStreamingMessage,
  onClearThread,
  onDeleteThread,
  onRemoveLastMessage,
  pendingPrompt,
  clearPendingPrompt,
  currentChapterIndex,
}: ChatPanelProps) {
  const [input, setInput] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const asks = useMemo(
    () => (activeThread ? groupAsks(activeThread.messages) : []),
    [activeThread],
  );

  const {
    query: chatQuery,
    setQuery: setChatQuery,
    active: filtering,
    visibleAsks,
  } = useAskFilter(asks, scrollRef, open);

  const { provider, setProvider, sending, submit, regenerateLast } =
    useChatStream({
      book,
      activeThread,
      currentChapterIndex,
      onAppendMessage,
      onAppendStreamingMessage,
      onUpdateStreamingText,
      onCommitStreamingMessage,
      onRemoveLastMessage,
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread, sending, open]);

  const handleSend = (text?: string): void => {
    const value = text ?? input;
    setInput("");
    void submit(value);
  };

  // Auto-fire pending prompt (e.g., from "Ask" selection action)
  useEffect(() => {
    if (open && pendingPrompt && activeThread && !sending) {
      const p = pendingPrompt;
      clearPendingPrompt();
      void submit(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingPrompt, activeThreadId]);

  if (!open) return null;

  const canClear = !!activeThread && !sending && asks.length > 0;

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-40 flex w-lg flex-col border-l border-rule-2 bg-paper shadow-[-6px_0_28px_-18px_rgba(31,27,22,.18)]">
      <ChatHeader onClose={onClose} />

      {activeThread && (
        <ChatToolbar
          query={chatQuery}
          onQueryChange={setChatQuery}
          filtering={filtering}
          shownCount={visibleAsks.length}
          totalCount={asks.length}
          canClear={canClear}
          onClear={() => onClearThread(activeThread.id)}
        />
      )}

      <ProviderToggle provider={provider} onChange={setProvider} />

      {threads.length > 1 && (
        <ContextTabs
          threads={threads}
          activeThreadId={activeThreadId}
          onSwitch={onSwitchThread}
          onDelete={onDeleteThread}
        />
      )}

      {/* Anchor card */}
      {activeThread?.anchor && (
        <div className="mx-4.4 mt-3.5 rounded-md border-l-2 border-accent bg-bg-2 px-3.5 py-3 font-serif text-meta italic leading-normal text-ink-2">
          “{activeThread.anchor.text.slice(0, 180)}
          {activeThread.anchor.text.length > 180 ? "…" : ""}”
        </div>
      )}

      {/* Asks list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5.5 py-4.5">
        {!activeThread && <ChatSkeleton />}
        {activeThread && asks.length === 0 && !sending && (
          <Greeting onPick={(p) => void submit(p)} />
        )}
        {filtering && visibleAsks.length === 0 && (
          <p className="py-6 text-center font-serif text-meta italic text-ink-3">
            No asks in this context mention “{chatQuery.trim()}”.
          </p>
        )}
        {visibleAsks.map(({ ask, index: i }) => {
          const isLast = i === asks.length - 1;
          return (
            <AskCard
              key={i}
              ask={ask}
              // The hook appends an empty assistant message up front, so
              // stay pending until the first token actually lands.
              pending={isLast && sending && !ask.answer?.text}
              onRegenerate={
                isLast && !sending && ask.answer ? regenerateLast : undefined
              }
            />
          );
        })}
        {sending && asks.length === 0 && (
          <PendingAsk text={input || pendingPrompt || ""} />
        )}
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        sending={sending}
      />
    </aside>
  );
}

export default ChatPanel;
