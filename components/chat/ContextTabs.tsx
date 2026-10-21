"use client";

import React from "react";
import { X } from "lucide-react";
import type { Thread } from "../../types";

interface ContextTabsProps {
  threads: Thread[];
  activeThreadId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}

/** One chip per thread. Anchored threads can be deleted; General can't. */
function ContextTabs({
  threads,
  activeThreadId,
  onSwitch,
  onDelete,
}: ContextTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-rule-2 px-5 py-2">
      <span className="mono-caption whitespace-nowrap">Context</span>
      {threads.map((t) => {
        const active = t.id === activeThreadId;
        const deletable = t.anchor !== null;
        return (
          <span
            key={t.id}
            className="nav-chip inline-flex items-center gap-1 whitespace-nowrap py-1 pl-2.5 pr-1 text-kicker"
            aria-pressed={active}
          >
            <button
              onClick={() => onSwitch(t.id)}
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
                    onDelete(t.id);
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
  );
}

export default ContextTabs;
