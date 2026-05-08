"use client";

interface BottomProgressBarProps {
  /** 0..1 fraction of progress through the book. */
  fraction: number;
}

function BottomProgressBar({ fraction }: BottomProgressBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20"
      style={{ height: 3, background: "var(--bg-2)" }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          background: "var(--accent)",
          transition: "width .1s linear",
        }}
      />
    </div>
  );
}

export default BottomProgressBar;
