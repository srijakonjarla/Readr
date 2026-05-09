"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, Send, Trash2 } from "lucide-react";
import type { Book, ChatMessage, Thread } from "../types";
import { groupAsks } from "./chat/types";
import { Greeting } from "./chat/Greeting";
import { AskCard, PendingAsk } from "./chat/AskCard";
import { useChatStream } from "./chat/useChatStream";

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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule-2 px-5.5 pb-3.5 pt-4.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-accent"
            style={{
              background: "color-mix(in oklab, var(--accent) 18%, transparent)",
            }}
          >
            <Sparkles size={15} strokeWidth={1.8} />
          </span>
          <div>
            <div className="font-serif text-base font-semibold text-ink">
              Companion
            </div>
            <div className="mono-caption">One question at a time</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer p-1 text-ink-3 btn-reset"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Toolbar (Clear) */}
      {activeThread && (
        <div className="flex items-center justify-end gap-2 border-b border-rule-2 px-5 py-1.5">
          <button
            onClick={() => {
              if (!canClear) return;
              if (
                window.confirm(
                  "Clear all asks in this context? Anchored selection (if any) will be kept.",
                )
              ) {
                onClearThread(activeThread.id);
              }
            }}
            disabled={!canClear}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-kicker font-medium text-ink-3 btn-reset ${
              canClear
                ? "cursor-pointer opacity-100"
                : "cursor-not-allowed opacity-40"
            }`}
            title={
              asks.length === 0
                ? "Nothing to clear in this context"
                : "Clear all asks in this context"
            }
          >
            <Trash2 size={12} /> Clear
          </button>
        </div>
      )}

      {/* Provider toggle */}
      <div className="flex items-center gap-2 border-b border-rule-2 px-5 py-2 text-kicker">
        <span className="mono-caption">Model</span>
        <button
          onClick={() => setProvider("openai")}
          className="nav-chip chip-mini"
          aria-pressed={provider === "openai"}
        >
          GPT-5.4
        </button>
        <button
          onClick={() => setProvider("claude")}
          className="nav-chip chip-mini"
          aria-pressed={provider === "claude"}
        >
          Claude Sonnet 4.6
        </button>
      </div>

      {/* Context (formerly thread tabs) */}
      {threads.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-rule-2 px-5 py-2">
          <span className="mono-caption whitespace-nowrap">Context</span>
          {threads.map((t) => {
            const active = t.id === activeThreadId;
            const deletable = t.id !== "main";
            return (
              <span
                key={t.id}
                className="nav-chip inline-flex items-center gap-1 whitespace-nowrap py-1 pl-2.5 pr-1 text-kicker"
                aria-pressed={active}
              >
                <button
                  onClick={() => onSwitchThread(t.id)}
                  className="cursor-pointer text-inherit btn-reset"
                >
                  {t.title}
                </button>
                {deletable && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete context "${t.title}"? Asks here will be lost.`,
                        )
                      ) {
                        onDeleteThread(t.id);
                      }
                    }}
                    aria-label={`Delete context ${t.title}`}
                    title="Delete context"
                    className="inline-flex cursor-pointer items-center rounded-full p-0.5 text-ink-3 opacity-70 btn-reset"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
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
        {activeThread && asks.length === 0 && !sending && (
          <Greeting onPick={(p) => void submit(p)} />
        )}
        {asks.map((ask, i) => {
          const isLast = i === asks.length - 1;
          return (
            <AskCard
              key={i}
              ask={ask}
              pending={isLast && sending && !ask.answer}
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

      {/* Composer */}
      <div className="border-t border-rule-2 bg-paper px-4.5 pb-4.5 pt-3.5">
        <div className="flex items-end gap-2 rounded-md border border-rule bg-bg py-2 pl-3.5 pr-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Ask one thing about what you've read…"
            className="max-h-35 flex-1 resize-none border-none bg-transparent py-1.5 font-serif text-prose leading-normal text-ink outline-hidden"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-meta font-semibold text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,.18)] transition-[opacity,filter] duration-150 btn-reset ${
              input.trim() && !sending
                ? "cursor-pointer opacity-100"
                : "cursor-not-allowed opacity-50"
            }`}
            aria-label="Send message"
          >
            <Send size={14} /> Ask
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-tiny uppercase tracking-[0.06em] text-ink-3">
          <span className="h-1 w-1 rounded-full bg-accent" />
          Each ask is independent — answers don&apos;t carry across questions
        </div>
      </div>
    </aside>
  );
}

export default ChatPanel;
