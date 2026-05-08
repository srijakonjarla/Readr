import { Highlighter, Sparkles } from "lucide-react";
import type { Highlight } from "../../types";

interface HighlightPopoverProps {
  x: number;
  y: number;
  highlight: Highlight;
  onPrimary: () => void;
  onRemove: () => void;
  onDismiss: () => void;
}

/**
 * Popover shown when a painted <mark> in the reading body is clicked.
 * - For thread highlights, primary action opens the existing chat thread.
 * - For pure highlights, primary action promotes them to a thread + opens chat.
 */
function HighlightPopover({
  x,
  y,
  highlight,
  onPrimary,
  onRemove,
  onDismiss,
}: HighlightPopoverProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        onClick={onDismiss}
        style={{ background: "transparent" }}
      />
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          transform: "translate(-50%, -100%)",
          background: "var(--ink)",
          borderRadius: 12,
          padding: 4,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 12px 28px -10px rgba(0,0,0,.35)",
          zIndex: 90,
        }}
      >
        <button
          onClick={onPrimary}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Sparkles size={13} />{" "}
          {highlight.kind === "thread" ? "Open thread" : "Ask about"}
        </button>
        <button
          onClick={onRemove}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,.85)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Highlighter size={13} /> Remove
        </button>
      </div>
    </>
  );
}

export default HighlightPopover;
