"use client";

import React, { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Ask } from "./types";

interface AskCardProps {
  ask: Ask;
  pending: boolean;
  onRegenerate?: () => void;
}

export function AskCard({ ask, pending, onRegenerate }: AskCardProps) {
  return (
    <div className="card mb-3.5 overflow-hidden rounded-md p-0">
      {/* Question */}
      <div
        className="border-b border-rule-2 px-3.5 pb-2 pt-2.5"
        style={{
          background: "color-mix(in oklab, var(--accent) 5%, transparent)",
        }}
      >
        <div className="kicker mb-1 text-tiny text-accent">Ask</div>
        <div className="font-serif text-prose font-semibold leading-[1.4] text-ink text-pretty">
          {ask.question.text}
        </div>
      </div>
      {/* Answer */}
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="kicker text-tiny">Answer</div>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-kicker font-medium text-ink-3 btn-reset"
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

export function PendingAsk({ text }: { text: string }) {
  return (
    <AskCard
      ask={{ question: { role: "user", text: text || "…" }, answer: null }}
      pending={true}
    />
  );
}

// Status copy by seconds waited. The model reads every chapter so far and
// thinks before its first token, so long books can take a while.
const WAIT_STAGES: { after: number; text: string }[] = [
  { after: 0, text: "Reading the chapters so far" },
  { after: 6, text: "Thinking it through" },
  { after: 15, text: "Still working — long books take a moment" },
];

function TypingDots() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);
  const stage = [...WAIT_STAGES].reverse().find((s) => elapsed >= s.after)!;

  return (
    <div
      className="flex items-center gap-2.5 py-1 text-ink-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1 text-accent">
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            className="inline-block h-1.5 w-1.5 animate-dot-pulse rounded-full bg-current"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <span className="font-serif text-meta italic">{stage.text}…</span>
      {elapsed >= 3 && (
        <span className="mono-caption ml-auto tabular-nums">{elapsed}s</span>
      )}
    </div>
  );
}
