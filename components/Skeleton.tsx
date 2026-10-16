"use client";

import React from "react";

// Loading placeholders shaped like the content they stand in for. Each layout
// fades in after a short delay so fast loads don't flash a skeleton.

interface BoneProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Bone({ className = "", style }: BoneProps) {
  return <span aria-hidden className={`skeleton ${className}`} style={style} />;
}

// Varied line widths read as paragraphs rather than a striped block.
const PARAGRAPHS = [
  [100, 97, 99, 94, 62],
  [98, 100, 95, 71],
  [100, 96, 99, 93, 98, 48],
  [97, 100, 84],
];

/** Paragraph-shaped lines sized to the reading column. */
export function ProseSkeleton({ label = "Loading chapter" }) {
  return (
    <div role="status" aria-label={label} className="animate-fade-in-late">
      {PARAGRAPHS.map((lines, p) => (
        <div key={p} className="mb-8 flex flex-col gap-3">
          {lines.map((w, i) => (
            <Bone key={i} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** First load of the reader: title, meta row, then prose. */
export function ReaderSkeleton() {
  return (
    <article className="min-h-screen">
      <div className="pointer-events-none fixed inset-x-0 top-5 flex justify-between px-5">
        <Bone className="h-10 w-48 rounded-full" />
        <Bone className="h-10 w-36 rounded-full" />
      </div>
      <div className="mx-auto max-w-reading px-14 pb-36 pt-24 animate-fade-in-late">
        <Bone className="mb-3 h-3 w-24" />
        <Bone className="h-12 w-3/4 rounded-lg" />
        <div className="mb-14 mt-10 flex gap-4">
          <Bone className="h-3 w-40" />
          <Bone className="h-3 w-24" />
        </div>
        <ProseSkeleton label="Loading book" />
      </div>
    </article>
  );
}

// Static lines on the shimmering cover panel.
function CoverLine({ className }: { className: string }) {
  return (
    <span aria-hidden className={`block rounded-md bg-paper/55 ${className}`} />
  );
}

/** Mirrors HeroCard / the preview card: gradient cover left, details right. */
export function HeroSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading book"
      className={`card-hero grid grid-cols-[1fr_1.3fr] animate-fade-in-late ${className}`}
    >
      <div className="skeleton flex min-h-95 flex-col justify-end gap-3 rounded-none p-10">
        <CoverLine className="h-3 w-24" />
        <CoverLine className="h-9 w-4/5 rounded-lg" />
        <CoverLine className="h-9 w-1/2 rounded-lg" />
        <CoverLine className="mt-1 h-3.5 w-32" />
      </div>
      <div className="flex flex-col gap-3 px-11 py-10">
        <Bone className="mb-3 h-3 w-32" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-11/12" />
        <Bone className="h-4 w-3/5" />
        <div className="flex-1" />
        <div className="grid grid-cols-3 gap-6 border-t border-rule-2 pt-7">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-2.5 w-14" />
              <Bone className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end">
          <Bone className="h-11 w-32 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

/** Mirrors BookCard. */
export function BookCardSkeleton() {
  return (
    <div className="card flex items-stretch gap-4.5 p-4.5 animate-fade-in-late">
      <Bone className="h-21 w-14 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2 pt-0.5">
        <Bone className="h-4 w-3/4" />
        <Bone className="h-3 w-1/3" />
        <div className="flex-1" />
        <div className="flex justify-between">
          <Bone className="h-3 w-12" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Library while the shelf loads: hero, then a grid of cards. */
export function LibrarySkeleton() {
  return (
    <div role="status" aria-label="Loading your library">
      <HeroSkeleton className="mb-18" />
      <Bone className="mb-7 h-7 w-44 rounded-lg" />
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Chat panel before the book's threads arrive: two ask cards. */
export function ChatSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading conversation"
      className="flex flex-col gap-7 animate-fade-in-late"
    >
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <Bone className="h-2.5 w-16" />
          <Bone className="h-5 w-4/5" />
          <div className="mt-2 flex flex-col gap-2 border-l-2 border-rule-2 pl-3.5">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-11/12" />
            <Bone className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
