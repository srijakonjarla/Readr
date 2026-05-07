import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, Send, Quote, MessageSquare } from "lucide-react";
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
  pendingPrompt,
  clearPendingPrompt,
  currentChapterIndex,
}: ChatPanelProps) {
  const [input, setInput] = useState<string>("");
  const [provider, setProvider] = useState<Provider>("claude");
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

  const submit = async (textArg?: string): Promise<void> => {
    const text = (textArg ?? input).trim();
    if (!text || !activeThread) return;
    setInput("");
    onAppendMessage(activeThread.id, { role: "user", text });
    setSending(true);

    try {
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onAppendMessage(activeThread.id, {
        role: "assistant",
        text: data.response,
        anchor: !!activeThread.anchor,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      onAppendMessage(activeThread.id, {
        role: "assistant",
        text: `Error: ${message}`,
      });
    } finally {
      setSending(false);
    }
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
    <aside
      className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
      style={{
        width: 420,
        background: "var(--paper)",
        borderLeft: "1px solid var(--rule-2)",
        boxShadow: "-6px 0 28px -18px rgba(31,27,22,.18)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "18px 22px 14px",
          borderBottom: "1px solid var(--rule-2)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in oklab, var(--accent) 18%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Sparkles size={15} strokeWidth={1.8} />
          </span>
          <div>
            <div
              className="text-ink"
              style={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Companion
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              One question at a time
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            all: "unset",
            cursor: "pointer",
            color: "var(--ink-3)",
            padding: 4,
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Provider toggle */}
      <div
        className="flex items-center gap-2 px-5 py-2"
        style={{ borderBottom: "1px solid var(--rule-2)", fontSize: 11 }}
      >
        <span
          className="text-ink-3"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Model
        </span>
        <button
          onClick={() => setProvider("openai")}
          className="nav-chip"
          aria-pressed={provider === "openai"}
          style={{ fontSize: 11, padding: "4px 10px" }}
        >
          GPT-4.1-mini
        </button>
        <button
          onClick={() => setProvider("claude")}
          className="nav-chip"
          aria-pressed={provider === "claude"}
          style={{ fontSize: 11, padding: "4px 10px" }}
        >
          Claude Sonnet 4.6
        </button>
      </div>

      {/* Context (formerly thread tabs) */}
      {threads.length > 1 && (
        <div
          className="flex items-center gap-2 px-5 py-2"
          style={{ borderBottom: "1px solid var(--rule-2)", overflowX: "auto" }}
        >
          <span
            className="text-ink-3"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Context
          </span>
          {threads.map((t) => {
            const active = t.id === activeThreadId;
            return (
              <button
                key={t.id}
                onClick={() => onSwitchThread(t.id)}
                className="nav-chip"
                aria-pressed={active}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                }}
              >
                {t.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Anchor card */}
      {activeThread?.anchor && (
        <div
          style={{
            margin: "14px 18px 0",
            padding: "12px 14px",
            background: "var(--bg-2)",
            borderRadius: 6,
            borderLeft: "2px solid var(--accent)",
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          “{activeThread.anchor.text.slice(0, 180)}
          {activeThread.anchor.text.length > 180 ? "…" : ""}”
        </div>
      )}

      {/* Asks list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: "18px 22px" }}
      >
        {activeThread && asks.length === 0 && !sending && (
          <Greeting onPick={(p) => void submit(p)} />
        )}
        {asks.map((ask, i) => (
          <AskCard
            key={i}
            ask={ask}
            pending={i === asks.length - 1 && sending && !ask.answer}
          />
        ))}
        {sending && asks.length === 0 && (
          <PendingAsk text={input || pendingPrompt || ""} />
        )}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "14px 18px 18px",
          borderTop: "1px solid var(--rule-2)",
          background: "var(--paper)",
        }}
      >
        <div
          className="flex items-end gap-2"
          style={{
            padding: "8px 8px 8px 14px",
            background: "var(--bg)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
          }}
        >
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
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--ink)",
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 15,
              lineHeight: 1.5,
              padding: "6px 0",
              maxHeight: 140,
            }}
          />
          <button
            onClick={() => void submit()}
            disabled={!input.trim() || sending}
            style={{
              all: "unset",
              cursor: input.trim() && !sending ? "pointer" : "not-allowed",
              padding: "10px 16px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              opacity: input.trim() && !sending ? 1 : 0.5,
              transition: "opacity .15s ease, filter .15s ease",
              boxShadow: "0 4px 10px -4px rgba(0,0,0,.18)",
            }}
            aria-label="Send message"
          >
            <Send size={14} /> Ask
          </button>
        </div>
        <div
          className="text-ink-3 mt-2 flex items-center gap-1.5"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              background: "var(--accent)",
            }}
          />
          Each ask is independent — answers don't carry across questions
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
      <h3
        className="text-ink"
        style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1.25,
          marginBottom: 6,
          textWrap: "pretty",
        }}
      >
        Ask me one thing.
      </h3>
      <p
        style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--ink-2)",
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        I have only the chapters you've read so far — and I treat every question
        as a fresh ask.
      </p>
      <div className="flex flex-col gap-1.5">
        {opts.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.label)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "var(--bg-2)",
              borderRadius: 6,
              border: "1px solid var(--rule-2)",
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 14,
              color: "var(--ink-2)",
            }}
          >
            <span style={{ color: "var(--accent)" }}>{o.icon}</span> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AskCard({ ask, pending }: { ask: Ask; pending: boolean }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 14,
        padding: 0,
        overflow: "hidden",
        borderRadius: 10,
      }}
    >
      {/* Question */}
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: "1px solid var(--rule-2)",
          background: "color-mix(in oklab, var(--accent) 5%, transparent)",
        }}
      >
        <div
          className="kicker"
          style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}
        >
          Ask
        </div>
        <div
          style={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.4,
            textWrap: "pretty",
          }}
        >
          {ask.question.text}
        </div>
      </div>
      {/* Answer */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div className="kicker" style={{ fontSize: 10, marginBottom: 6 }}>
          Answer
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
    <div
      className="flex items-center gap-1 py-1"
      style={{ color: "var(--ink-3)" }}
    >
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className="animate-dot-pulse"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default ChatPanel;
