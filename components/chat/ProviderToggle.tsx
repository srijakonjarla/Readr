"use client";

import React from "react";
import type { Provider } from "../../types";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "openai", label: "GPT-5.6 Sol" },
  { id: "claude", label: "Claude Opus 5.5" },
];

interface ProviderToggleProps {
  provider: Provider;
  onChange: (p: Provider) => void;
}

function ProviderToggle({ provider, onChange }: ProviderToggleProps) {
  return (
    <div className="flex items-center gap-2 border-b border-rule-2 px-5 py-2 text-kicker">
      <span className="mono-caption">Model</span>
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className="nav-chip chip-mini"
          aria-pressed={provider === p.id}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default ProviderToggle;
