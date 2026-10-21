"use client";

import React from "react";
import { Send } from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}

function Composer({ value, onChange, onSend, sending }: ComposerProps) {
  const ready = !!value.trim() && !sending;
  return (
    <div className="border-t border-rule-2 bg-paper px-4.5 pb-4.5 pt-3.5">
      <div className="flex items-end gap-2 rounded-md border border-rule bg-bg py-2 pl-3.5 pr-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask one thing about what you've read…"
          className="max-h-35 flex-1 resize-none border-none bg-transparent py-1.5 font-serif text-prose leading-normal text-ink outline-hidden"
        />
        <button
          onClick={onSend}
          disabled={!ready}
          className={`inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-meta font-semibold text-white shadow-[0_4px_10px_-4px_rgba(0,0,0,.18)] transition-[opacity,filter] duration-150 btn-reset ${
            ready
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
  );
}

export default Composer;
