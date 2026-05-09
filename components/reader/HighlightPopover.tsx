"use client";

import { Highlighter, Sparkles } from "lucide-react";
import type { Highlight } from "../../types";
import { popoverPosition } from "../../lib/styles";

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
      <div className="fixed inset-0 z-80 bg-transparent" onClick={onDismiss} />
      <div className="popover" style={popoverPosition(x, y)}>
        <button onClick={onPrimary} className="popover-btn popover-btn-primary">
          <Sparkles size={13} />{" "}
          {highlight.kind === "thread" ? "Open thread" : "Ask about"}
        </button>
        <button onClick={onRemove} className="popover-btn">
          <Highlighter size={13} /> Remove
        </button>
      </div>
    </>
  );
}

export default HighlightPopover;
