import { ArrowLeft, Bookmark, List, Search } from "lucide-react";

interface FloatingChromeProps {
  chapterIndex: number;
  chapterCount: number;
  chapterTitle: string;
  progressFraction: number; // 0..1 — fraction across the whole book
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onBackToLibrary: () => void;
  onShowToc: () => void;
}

/**
 * The 3 floating pill clusters at the top of the reader: nav (left),
 * chapter + progress (center), and bookmark (right).
 */
function FloatingChrome({
  chapterIndex,
  chapterCount,
  chapterTitle,
  progressFraction,
  bookmarked,
  onToggleBookmark,
  onBackToLibrary,
  onShowToc,
}: FloatingChromeProps) {
  const pct = Math.round(progressFraction * 100);
  return (
    <div className="pointer-events-none fixed left-4 right-4 top-4 z-40 flex items-center justify-between">
      <div className="float-pill">
        <button onClick={onBackToLibrary} className="pill-btn" title="Library">
          <ArrowLeft size={15} />
        </button>
        <span className="pill-divider" />
        <button onClick={onShowToc} className="pill-btn" title="Contents">
          <List size={15} />
        </button>
        <button className="pill-btn" title="Search" disabled>
          <Search size={15} />
        </button>
      </div>

      <div
        className="float-pill"
        style={{
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink-2)",
        }}
      >
        <span style={{ color: "var(--ink-3)" }}>Ch. {chapterIndex + 1}</span>
        <span style={{ margin: "0 8px" }}>{chapterTitle || "—"}</span>
        <span style={{ color: "var(--ink-3)", marginRight: 8 }}>·</span>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          {pct}%
        </span>
        <span style={{ display: "none" }}>{chapterCount}</span>
      </div>

      <div className="float-pill">
        <button
          onClick={onToggleBookmark}
          className="pill-btn"
          title={bookmarked ? "Bookmarked" : "Bookmark"}
          style={bookmarked ? { color: "var(--accent)" } : undefined}
        >
          <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

export default FloatingChrome;
