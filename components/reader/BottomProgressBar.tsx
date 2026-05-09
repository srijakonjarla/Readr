"use client";

interface BottomProgressBarProps {
  /** 0..1 fraction of progress through the book. */
  fraction: number;
}

function BottomProgressBar({ fraction }: BottomProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 h-0.75 bg-bg-2">
      <div
        className="h-full bg-accent transition-[width] duration-100 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default BottomProgressBar;
