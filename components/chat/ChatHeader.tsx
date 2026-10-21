"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";

function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
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
  );
}

export default ChatHeader;
