"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Sparkles,
  Send,
  Quote,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Book, ChatMessage, Provider, Thread } from "../types";

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

interface Ask {
  question: ChatMessage;
  answer: ChatMessage | null;
}

const groupAsks = (messages: ChatMessage[]): Ask[] => {
  const result: Ask[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      const next = messages[i + 1];
      const answer = next?.role === "assistant" ? next : null;
      result.push({ question: msg, answer });
      if (answer) i++;
    } else {
      // Orphan assistant message (shouldn't happen but be defensive)
      result.push({
        question: { role: "user", text: "(no question)" },
        answer: msg,
      });
    }
  }
  return result;
};

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
  const [provider, setProvider] = useState<Provider>("openai");
  const [sending, setSending] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const asks = useMemo(
    () => (activeThread ? groupAsks(activeThread.messages) : []),
    [activeThread],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread, sending, open]);

  const submit = async (
    textArg?: string,
    options?: { skipUserAppend?: boolean },
  ): Promise<void> => {
    const text = (textArg ?? input).trim();
    if (!text || !activeThread) return;
    setInput("");
    if (!options?.skipUserAppend) {
      onAppendMessage(activeThread.id, { role: "user", text });
    }
    setSending(true);

    // Spoiler cutoff: anchored thread captures its chapter at creation
    // time; for the General thread, fall back to the reader's current
    // chapter so we don't accidentally send the rest of the book.
    const cutoffIdx = activeThread.chapterIndex ?? currentChapterIndex;
    const body = {
      query: text,
      context: activeThread.anchor?.text ?? "",
      filename: book.filename,
      currentChapterIndex: cutoffIdx >= 0 ? cutoffIdx : undefined,
      provider,
    };

    // Add an empty assistant placeholder; we'll fill it as tokens arrive.
    const anchored = !!activeThread.anchor;
    onAppendStreamingMessage(activeThread.id, {
      role: "assistant",
      text: "",
      anchor: anchored,
    });

    let accumulated = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(
          (errPayload as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          accumulated += decoder.decode(value, { stream: true });
          onUpdateStreamingText(activeThread.id, accumulated);
        }
      }
      // Flush any remaining bytes from the decoder.
      const tail = decoder.decode();
      if (tail) {
        accumulated += tail;
        onUpdateStreamingText(activeThread.id, accumulated);
      }

      onCommitStreamingMessage(activeThread.id, {
        role: "assistant",
        text: accumulated,
        anchor: anchored,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const errorText = accumulated
        ? `${accumulated}\n\n[Error: ${message}]`
        : `Error: ${message}`;
      onUpdateStreamingText(activeThread.id, errorText);
      onCommitStreamingMessage(activeThread.id, {
        role: "assistant",
        text: errorText,
        anchor: anchored,
      });
    } finally {
      setSending(false);
    }
  };

  // Regenerate the last answer: drop the existing assistant message and
  // re-ask the same question (without re-appending the user message).
  const regenerateLast = (): void => {
    if (!activeThread || sending) return;
    const last = activeThread.messages[activeThread.messages.length - 1];
    const prev = activeThread.messages[activeThread.messages.length - 2];
    if (!last || last.role !== "assistant" || !prev || prev.role !== "user") {
      return;
    }
    onRemoveLastMessage(activeThread.id);
    void submit(prev.text, { skipUserAppend: true });
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

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-40 flex w-[420px] flex-col border-l border-rule-2 bg-paper shadow-[-6px_0_28px_-18px_rgba(31,27,22,.18)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule-2 px-[22px] pb-3.5 pt-[18px]">
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

      {/* Toolbar (Clear) — always visible so it persists across both contexts;
          disabled when there's nothing to clear or while a request is in flight. */}
      {activeThread && (
        <div className="flex items-center justify-end gap-2 border-b border-rule-2 px-5 py-1.5">
          {(() => {
            const canClear = !sending && asks.length > 0;
            return (
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
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-3 btn-reset ${
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
            );
          })()}
        </div>
      )}

      {/* Provider toggle */}
      <div className="flex items-center gap-2 border-b border-rule-2 px-5 py-2 text-[11px]">
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
                className="nav-chip inline-flex items-center gap-1 whitespace-nowrap py-1 pl-2.5 pr-1 text-[11px]"
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
        <div className="mx-[18px] mt-3.5 rounded-md border-l-2 border-accent bg-bg-2 px-3.5 py-3 font-serif text-[13px] italic leading-[1.5] text-ink-2">
          “{activeThread.anchor.text.slice(0, 180)}
          {activeThread.anchor.text.length > 180 ? "…" : ""}”
        </div>
      )}

      {/* Asks list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[22px] py-[18px]"
      >
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
      <div className="border-t border-rule-2 bg-paper px-[18px] pb-[18px] pt-3.5">
        <div className="flex items-end gap-2 rounded-[10px] border border-rule bg-bg py-2 pl-3.5 pr-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Ask one thing about what you've read…"
            className="max-h-[140px] flex-1 resize-none border-none bg-transparent py-1.5 font-serif text-[15px] leading-[1.5] text-ink outline-none"
          />
          <button
            onClick={() => void submit()}
            disabled={!input.trim() || sending}
            className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,.18)] transition-[opacity,filter] duration-150 btn-reset ${
              input.trim() && !sending
                ? "cursor-pointer opacity-100"
                : "cursor-not-allowed opacity-50"
            }`}
            aria-label="Send message"
          >
            <Send size={14} /> Ask
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          <span className="h-1 w-1 rounded-full bg-accent" />
          Each ask is independent — answers don&apos;t carry across questions
        </div>
      </div>
    </aside>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Greeting({ onPick }: { onPick: (prompt: string) => void }) {
  const opts: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <Sparkles size={15} />, label: "Summarize what I have read" },
    { icon: <Quote size={15} />, label: "Generate discussion questions" },
    {
      icon: <MessageSquare size={15} />,
      label: "Explain the central idea simply",
    },
  ];
  return (
    <div className="pb-4 pt-2">
      <h3 className="mb-1.5 font-serif text-[22px] font-semibold leading-[1.25] text-ink [text-wrap:pretty]">
        Ask me one thing.
      </h3>
      <p className="mb-[18px] font-serif text-sm italic leading-[1.5] text-ink-2">
        I have only the chapters you&apos;ve read so far — and I treat every
        question as a fresh ask.
      </p>
      <div className="flex flex-col gap-1.5">
        {opts.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.label)}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-rule-2 bg-bg-2 px-3.5 py-3 font-serif text-sm text-ink-2 btn-reset"
          >
            <span className="text-accent">{o.icon}</span> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AskCard({
  ask,
  pending,
  onRegenerate,
}: {
  ask: Ask;
  pending: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <div className="card mb-3.5 overflow-hidden rounded-[10px] p-0">
      {/* Question */}
      <div
        className="border-b border-rule-2 px-3.5 pb-2 pt-2.5"
        style={{
          background: "color-mix(in oklab, var(--accent) 5%, transparent)",
        }}
      >
        <div className="kicker mb-1 text-[10px] text-accent">Ask</div>
        <div className="font-serif text-[15px] font-semibold leading-[1.4] text-ink [text-wrap:pretty]">
          {ask.question.text}
        </div>
      </div>
      {/* Answer */}
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="kicker text-[10px]">Answer</div>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-3 btn-reset"
              title="Re-ask the same question"
            >
              <RotateCcw size={11} /> Regenerate
            </button>
          )}
        </div>
        {pending || !ask.answer ? (
          <TypingDots />
        ) : (
          <div className="ask-answer">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ask.answer.text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingAsk({ text }: { text: string }) {
  return (
    <AskCard
      ask={{ question: { role: "user", text: text || "…" }, answer: null }}
      pending={true}
    />
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1 text-ink-3">
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className="inline-block h-1.5 w-1.5 animate-dot-pulse rounded-full bg-current"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

export default ChatPanel;
