"use client";

import type { TocItem } from "../../types";

interface LeftRailDotsProps {
  toc: TocItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Vertically-centered fixed rail showing one dot per chapter; the active
 * chapter elongates and tints in the accent.
 */
function LeftRailDots({ toc, currentIndex, onSelect }: LeftRailDotsProps) {
  if (toc.length <= 1) return null;
  return (
    <div
      className="fixed top-1/2 z-30 flex flex-col gap-2.5"
      style={{ left: 36, transform: "translateY(-50%)" }}
    >
      {toc.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onSelect(i)}
          title={c.title}
          style={{
            width: i === currentIndex ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === currentIndex ? "var(--accent)" : "var(--rule)",
            transition: "all .25s ease",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

export default LeftRailDots;
