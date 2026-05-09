"use client";

import React from "react";
import { Sparkles, Quote, MessageSquare } from "lucide-react";

interface GreetingProps {
  onPick: (prompt: string) => void;
}

const OPTIONS: Array<{ icon: React.ReactNode; label: string }> = [
  { icon: <Sparkles size={15} />, label: "Summarize what I have read" },
  { icon: <Quote size={15} />, label: "Generate discussion questions" },
  {
    icon: <MessageSquare size={15} />,
    label: "Explain the central idea simply",
  },
];

export function Greeting({ onPick }: GreetingProps) {
  return (
    <div className="pb-4 pt-2">
      <h3 className="mb-1.5 font-serif text-2xl font-semibold leading-tight text-ink text-pretty">
        Ask me one thing.
      </h3>
      <p className="mb-4.5 font-serif text-sm italic leading-normal text-ink-2">
        I have only the chapters you&apos;ve read so far — and I treat every
        question as a fresh ask.
      </p>
      <div className="flex flex-col gap-1.5">
        {OPTIONS.map((o) => (
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
