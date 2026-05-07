import React from 'react';
import { miniGradient } from '../util/hue';

interface MiniCoverProps {
  hue: number;
  title?: string;
  width?: number;
  height?: number;
  progress?: number;
}

const MiniCover: React.FC<MiniCoverProps> = ({
  hue,
  title,
  width = 56,
  height = 84,
  progress,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: miniGradient(hue),
        boxShadow: '0 6px 16px -8px rgba(31,27,22,.3)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {title && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 8,
            right: 8,
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: 9,
            fontWeight: 600,
            color: '#fff',
            lineHeight: 1.1,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
      )}
      {typeof progress === 'number' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            background: 'rgba(255,255,255,.15)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MiniCover;
