"use client";

import React, { useEffect, useRef } from "react";
import { X, Sparkles, MessageSquare } from "lucide-react";
import type { TocItem } from "../types";

interface TocDrawerProps {
  toc: TocItem[];
  currentIndex: number;
  bookTitle: string;
  author?: string;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function TocDrawer({
  toc,
  currentIndex,
  bookTitle,
  author,
  onSelect,
  onClose,
}: TocDrawerProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-transparent" onClick={onClose} />
      <aside
        className="fixed bottom-4 left-4 top-[76px] z-[55] w-80 overflow-y-auto rounded-2xl border border-rule-2 bg-paper px-[22px] pb-[18px] pt-[22px] shadow-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <span className="kicker">Contents</span>
          <button onClick={onClose} className="btn-reset text-ink-3">
            <X size={16} />
          </button>
        </div>

        <h3 className="m-0 text-[17px] font-bold leading-[1.2] tracking-[-0.01em] text-ink">
          {bookTitle}
        </h3>
        {author && (
          <div className="mb-4 mt-1 text-[13px] text-ink-3">{author}</div>
        )}

        <div className="flex flex-col gap-0.5">
          {toc.map((c, i) => {
            const active = i === currentIndex;
            return (
              <button
                key={c.id}
                ref={active ? activeRef : undefined}
                onClick={() => onSelect(i)}
                className="toc-chapter-btn"
                data-active={active}
              >
                <span className="toc-chapter-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="toc-chapter-title">{c.title}</span>
              </button>
            );
          })}
        </div>

        <div className="drawer-divider" />

        <div className="kicker mb-2">Quick actions</div>
        <button className="drawer-action-btn" disabled title="Coming soon">
          <Sparkles size={14} className="text-accent" /> Summarize this chapter
        </button>
        <button className="drawer-action-btn" disabled title="Coming soon">
          <MessageSquare size={14} className="text-accent" /> Discussion
          questions
        </button>
      </aside>
    </>
  );
}

export default TocDrawer;
