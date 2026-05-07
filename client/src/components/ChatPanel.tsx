import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Send, Quote, MessageSquare } from 'lucide-react';
import type { Book, ChatMessage, Provider, Thread } from '../types';

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
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  open,
  onClose,
  book,
  threads,
  activeThreadId,
  onSwitchThread,
  onAppendMessage,
  pendingPrompt,
  clearPendingPrompt,
}) => {
  const [input, setInput] = useState<string>('');
  const [provider, setProvider] = useState<Provider>('claude');
  const [sending, setSending] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread, sending, open]);

  const submit = async (textArg?: string): Promise<void> => {
    const text = (textArg ?? input).trim();
    if (!text || !activeThread) return;
    setInput('');
    onAppendMessage(activeThread.id, { role: 'user', text });
    setSending(true);

    try {
      const body = {
        query: text,
        context: activeThread.anchor?.text ?? '',
        filename: book.filename,
        currentChapterIndex: activeThread.chapterIndex ?? undefined,
        provider,
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onAppendMessage(activeThread.id, {
        role: 'assistant',
        text: data.response,
        anchor: !!activeThread.anchor,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onAppendMessage(activeThread.id, {
        role: 'assistant',
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
        background: 'var(--paper)',
        borderLeft: '1px solid var(--rule-2)',
        boxShadow: '-6px 0 28px -18px rgba(31,27,22,.18)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--rule-2)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'color-mix(in oklab, var(--accent) 18%, transparent)',
              color: 'var(--accent)',
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
                color: 'var(--ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Reading with you
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Provider toggle */}
      <div
        className="flex items-center gap-2 px-5 py-2"
        style={{ borderBottom: '1px solid var(--rule-2)', fontSize: 11 }}
      >
        <span className="text-ink-3" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Model
        </span>
        <button
          onClick={() => setProvider('openai')}
          className="nav-chip"
          aria-selected={provider === 'openai'}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          GPT-4.1-mini
        </button>
        <button
          onClick={() => setProvider('claude')}
          className="nav-chip"
          aria-selected={provider === 'claude'}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          Claude Sonnet 4.6
        </button>
      </div>

      {/* Thread tabs */}
      {threads.length > 1 && (
        <div
          className="flex gap-0.5 overflow-x-auto px-3.5"
          style={{ borderBottom: '1px solid var(--rule-2)', paddingTop: 10 }}
        >
          {threads.map((t) => {
            const active = t.id === activeThreadId;
            return (
              <button
                key={t.id}
                onClick={() => onSwitchThread(t.id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  whiteSpace: 'nowrap',
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
            margin: '14px 18px 0',
            padding: '12px 14px',
            background: 'var(--bg-2)',
            borderRadius: 6,
            borderLeft: '2px solid var(--accent)',
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.5,
          }}
        >
          “{activeThread.anchor.text.slice(0, 180)}{activeThread.anchor.text.length > 180 ? '…' : ''}”
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: '18px 22px' }}>
        {activeThread && activeThread.messages.length === 0 && (
          <Greeting onPick={(p) => void submit(p)} />
        )}
        {activeThread?.messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        {sending && <TypingDots />}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: '14px 18px 18px',
          borderTop: '1px solid var(--rule-2)',
          background: 'var(--paper)',
        }}
      >
        <div
          className="flex items-end gap-2"
          style={{
            padding: '8px 8px 8px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Ask about what you're reading…"
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 15,
              lineHeight: 1.5,
              padding: '6px 0',
              maxHeight: 140,
            }}
          />
          <button
            onClick={() => void submit()}
            disabled={!input.trim() || sending}
            style={{
              all: 'unset',
              cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              padding: '10px 16px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              opacity: input.trim() && !sending ? 1 : 0.5,
              transition: 'opacity .15s ease, filter .15s ease',
              boxShadow: '0 4px 10px -4px rgba(0,0,0,.18)',
            }}
            aria-label="Send message"
          >
            <Send size={14} /> Send
          </button>
        </div>
        <div
          className="text-ink-3 mt-2"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Spoiler-safe · Knows up to your current chapter · Shift+Enter for newline
        </div>
      </div>
    </aside>
  );
};

const Greeting: React.FC<{ onPick: (prompt: string) => void }> = ({ onPick }) => {
  const opts: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <Sparkles size={15} />, label: 'Summarize this chapter' },
    { icon: <Quote size={15} />, label: 'Generate discussion questions' },
    { icon: <MessageSquare size={15} />, label: 'Explain the key argument simply' },
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
          textWrap: 'pretty',
        }}
      >
        What would you like to think about?
      </h3>
      <p
        style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--ink-2)',
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        I have only the chapters you've read so far — I won't spoil what's ahead.
      </p>
      <div className="flex flex-col gap-1.5">
        {opts.map((o) => (
          <button
            key={o.label}
            onClick={() => onPick(o.label)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--bg-2)',
              borderRadius: 6,
              border: '1px solid var(--rule-2)',
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 14,
              color: 'var(--ink-2)',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>{o.icon}</span> {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const Bubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 4,
        marginBottom: 14,
      }}
    >
      {msg.anchor && !isUser && (
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Replying about your selection
        </div>
      )}
      <div
        style={{
          maxWidth: '88%',
          padding: isUser ? '10px 14px' : '4px 0',
          background: isUser ? 'var(--bg-2)' : 'transparent',
          border: isUser ? '1px solid var(--rule-2)' : 'none',
          borderRadius: isUser ? 14 : 0,
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
          textWrap: 'pretty',
        }}
      >
        {msg.text}
      </div>
    </div>
  );
};

const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 py-1" style={{ color: 'var(--ink-3)' }}>
    {[0, 0.2, 0.4].map((delay) => (
      <span
        key={delay}
        className="animate-dot-pulse"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          display: 'inline-block',
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
);

export default ChatPanel;
