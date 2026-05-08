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
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{ background: "transparent" }}
      />
      <aside
        className="fixed z-[55] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          left: 16,
          top: 76,
          bottom: 16,
          width: 320,
          background: "var(--paper)",
          border: "1px solid var(--rule-2)",
          borderRadius: 16,
          boxShadow: "0 24px 60px -20px rgba(31,27,22,.25)",
          padding: "22px 22px 18px",
        }}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <span className="kicker">Contents</span>
          <button
            onClick={onClose}
            className="text-ink-3"
            style={{ all: "unset", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        <h3
          className="text-ink"
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {bookTitle}
        </h3>
        {author && (
          <div
            className="text-ink-3"
            style={{ fontSize: 13, marginBottom: 16, marginTop: 4 }}
          >
            {author}
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 2 }}>
          {toc.map((c, i) => {
            const active = i === currentIndex;
            return (
              <button
                key={c.id}
                ref={active ? activeRef : undefined}
                onClick={() => onSelect(i)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  padding: "10px 12px",
                  borderRadius: 8,
                  display: "grid",
                  gridTemplateColumns: "24px 1fr",
                  gap: 10,
                  alignItems: "center",
                  background: active
                    ? "color-mix(in oklab, var(--accent) 12%, transparent)"
                    : "transparent",
                }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    color: active ? "var(--accent)" : "var(--ink-3)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="truncate"
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--ink)" : "var(--ink-2)",
                  }}
                >
                  {c.title}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--rule-2)",
            margin: "18px 0 14px",
          }}
        />

        <div className="kicker mb-2">Quick actions</div>
        <button
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 8,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink-2)",
          }}
          disabled
          title="Coming soon"
        >
          <Sparkles size={14} className="text-accent" /> Summarize this chapter
        </button>
        <button
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 8,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink-2)",
          }}
          disabled
          title="Coming soon"
        >
          <MessageSquare size={14} className="text-accent" /> Discussion
          questions
        </button>
      </aside>
    </>
  );
}

export default TocDrawer;
