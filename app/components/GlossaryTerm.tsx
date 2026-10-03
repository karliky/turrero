"use client";
import { useId, useState } from "react";

interface GlossaryTermProps {
  slug: string;
  term: string;
  short: string;
  children: React.ReactNode;
}

/** A glossary term inside a turra: dotted underline, its definition on hover/focus, link to the entry. */
export function GlossaryTerm({ slug, term, short, children }: GlossaryTermProps) {
  const id = useId();
  // Fixed positioning so the card is not clipped by the article column
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const show = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 336) });
  };
  const hide = () => setPosition(null);

  return (
    <a
      href={`/glosario/${slug}`}
      aria-describedby={id}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="underline decoration-whiskey-500 decoration-dotted decoration-2 underline-offset-4 hover:decoration-solid"
    >
      {children}
      <span
        id={id}
        role="tooltip"
        style={position ?? undefined}
        className={`pointer-events-none fixed z-50 block w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-whiskey-200 bg-surface p-3 text-left text-sm font-normal leading-snug text-whiskey-900 shadow-lg transition-opacity ${
          position ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <span className="block font-serif font-bold text-whiskey-950">{term}</span>
        <span className="mt-1 block">{short}</span>
        <span className="mt-2 block text-xs font-medium text-whiskey-700">Ver en el glosario</span>
      </span>
    </a>
  );
}
