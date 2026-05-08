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
    <div className="fixed left-9 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2.5">
      {toc.map((c, i) => {
        const active = i === currentIndex;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(i)}
            title={c.title}
            className={`h-1.5 cursor-pointer rounded-[3px] border-0 p-0 transition-all duration-[250ms] ease-in-out ${
              active ? "w-[18px] bg-accent" : "w-1.5 bg-rule"
            }`}
          />
        );
      })}
    </div>
  );
}

export default LeftRailDots;
