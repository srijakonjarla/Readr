"use client";

import React from "react";
import { miniGradient } from "../util/hue";
import { FONT } from "../lib/styles";

interface MiniCoverProps {
  hue: number;
  title?: string;
  width?: number;
  height?: number;
  progress?: number;
}

function MiniCover({
  hue,
  title,
  width = 56,
  height = 84,
  progress,
}: MiniCoverProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md shadow-mini"
      style={{ width, height, background: miniGradient(hue) }}
    >
      {title && (
        <div
          className="absolute left-2 right-2 top-2.5 overflow-hidden text-micro font-semibold leading-[1.1] text-white"
          style={{
            fontFamily: FONT.serif,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>
      )}
      {typeof progress === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
          <div
            className="h-full bg-accent"
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default MiniCover;
