"use client";

import {
  Globe,
  Highlighter,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

interface SelectionPopoverProps {
  x: number;
  y: number;
  onAsk: () => void;
  onHighlight: () => void;
}

/**
 * Dark popover anchored above a text selection. Ask (accent) + Highlight are
 * functional; Define + Note are placeholders.
 */
function SelectionPopover({
  x,
  y,
  onAsk,
  onHighlight,
}: SelectionPopoverProps) {
  return (
    <div
      // Prevent the browser from clearing the user's text selection when
      // they mousedown on the popover (so the highlighted text stays visible
      // while the popover is open).
      onMouseDown={(e) => e.preventDefault()}
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
        onClick={onAsk}
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
        <Sparkles size={13} /> Ask
      </button>
      <PopBtn onClick={onHighlight} icon={Highlighter} label="Highlight" />
      <PopBtn icon={Globe} label="Define" disabled />
      <PopBtn icon={StickyNote} label="Note" disabled />
    </div>
  );
}

interface PopBtnProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function PopBtn({ icon: Icon, label, onClick, disabled }: PopBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        all: "unset",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 12px",
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "rgba(255,255,255,.85)",
        fontSize: 12,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

export default SelectionPopover;
