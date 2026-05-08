"use client";

import {
  Globe,
  Highlighter,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { popoverPosition } from "../../lib/styles";

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
function SelectionPopover({ x, y, onAsk, onHighlight }: SelectionPopoverProps) {
  return (
    <div
      // Prevent the browser from clearing the user's text selection when
      // they mousedown on the popover (so the highlighted text stays visible
      // while the popover is open).
      onMouseDown={(e) => e.preventDefault()}
      className="popover"
      style={popoverPosition(x, y)}
    >
      <button onClick={onAsk} className="popover-btn popover-btn-primary">
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
    <button onClick={onClick} disabled={disabled} className="popover-btn">
      <Icon size={13} /> {label}
    </button>
  );
}

export default SelectionPopover;
