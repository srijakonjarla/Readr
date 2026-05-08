"use client";

import { ArrowRight } from "lucide-react";

interface UpNextCardProps {
  title: string;
  chapterNumber: number;
  onContinue: () => void;
}

/**
 * The "Up next" card shown at the bottom of each chapter.
 */
function UpNextCard({ title, chapterNumber, onContinue }: UpNextCardProps) {
  return (
    <div className="mt-20 grid grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-rule-2 bg-paper p-7">
      <div>
        <div className="kicker mb-2">Up next</div>
        <div className="text-2xl font-bold tracking-[-0.02em] text-ink">
          {title}
        </div>
        <div className="mt-1 text-sm text-ink-3">Chapter {chapterNumber}</div>
      </div>
      <button onClick={onContinue} className="btn-ink">
        Continue <ArrowRight size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default UpNextCard;
