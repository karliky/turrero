'use client';

import { useId, useState } from 'react';

interface TooltipProps {
  label: string;
  content: string;
}

interface TooltipPosition {
  top: number;
  left: number;
}

// Fixed positioning so the tooltip is not clipped by overflow-hidden ancestors
export default function Tooltip({ label, content }: TooltipProps): React.ReactElement {
  const tooltipId = useId();
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const show = (e: React.SyntheticEvent<HTMLSpanElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ top: rect.top - 8, left: rect.left });
  };
  const hide = (): void => setPosition(null);

  return (
    <span
      tabIndex={0}
      aria-describedby={tooltipId}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="text-whiskey-700 text-xs whitespace-nowrap border-b border-dotted border-whiskey-300 cursor-help hover:text-whiskey-900 transition-colors"
    >
      {label}
      <span
        id={tooltipId}
        role="tooltip"
        style={position ? { top: position.top, left: position.left } : undefined}
        className={`fixed z-50 -translate-y-full py-2 px-3 bg-whiskey-950 text-xs font-medium text-whiskey-50 rounded-md shadow-lg max-w-xs whitespace-normal pointer-events-none transition-opacity ${
          position ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {content}
      </span>
    </span>
  );
}
