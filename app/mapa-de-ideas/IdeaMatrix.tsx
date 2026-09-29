"use client";

import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { countByYear } from "@/lib/concepts";
import { GLOSSARY_GROUPS, type ConceptRow, type GlossaryGroup, type MapThread } from "@/lib/types";
import { ConceptDetail } from "./ConceptDetail";

interface IdeaMatrixProps {
  concepts: ConceptRow[];
  threads: MapThread[];
  years: string[];
}

/**
 * Steps of the site's whiskey palette, lightest first: a calm, readable scale for a table with hundreds of cells.
 * Red is kept for the selected concept.
 */
const STEPS = [
  { from: 1, label: "1", bg: "var(--color-whiskey-100)", fg: "var(--color-whiskey-900)" },
  { from: 2, label: "2", bg: "var(--color-whiskey-200)", fg: "var(--color-whiskey-900)" },
  { from: 3, label: "3-4", bg: "var(--color-whiskey-300)", fg: "var(--color-whiskey-950)" },
  { from: 5, label: "5-7", bg: "var(--color-whiskey-400)", fg: "var(--color-whiskey-950)" },
  { from: 8, label: "8-11", bg: "var(--color-whiskey-700)", fg: "var(--color-whiskey-50)" },
  { from: 12, label: "12 o más", bg: "var(--color-whiskey-900)", fg: "var(--color-whiskey-50)" },
];

function cellStyle(count: number): React.CSSProperties {
  const step = STEPS.findLast((s) => count >= s.from);
  return step ? { backgroundColor: step.bg, color: step.fg } : {};
}

export function IdeaMatrix({ concepts, threads, years }: IdeaMatrixProps) {
  const selected = useSearchParams().get("concepto");
  const detail = useRef<HTMLDivElement>(null);

  const yearOf = new Map(threads.map((thread) => [thread.id, thread.publishedAt.slice(0, 4)]));
  const rows = concepts.map((concept) => {
    const counts = countByYear(concept.threads, (id) => yearOf.get(id) ?? "", years);
    return { concept, counts, first: counts.findIndex((count) => count > 0) };
  });
  const groups = (Object.keys(GLOSSARY_GROUPS) as GlossaryGroup[])
    .map((group) => ({
      group,
      rows: rows
        .filter((row) => row.concept.group === group)
        // When each idea first appears, then the most present first
        .sort((a, b) => a.first - b.first || b.concept.threads.length - a.concept.threads.length),
    }))
    .filter(({ rows }) => rows.length > 0);

  const current = concepts.find((concept) => concept.slug === selected) ?? null;

  const select = (slug: string) => {
    // Only the URL changes, in the browser: Next syncs useSearchParams without asking the server for the page again
    window.history.replaceState(null, "", `?concepto=${slug}`);
    // On narrow screens the detail sits under the table: bring it into view
    if (detail.current && window.matchMedia("(max-width: 1023px)").matches) {
      detail.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <div className="overflow-x-auto rounded-xl border border-whiskey-200 bg-surface">
          <table className="w-full border-separate border-spacing-[3px] text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium text-whiskey-800">
                  Concepto
                </th>
                {years.map((year) => (
                  <th key={year} scope="col" className="min-w-10 px-1 py-2 text-center font-medium tabular-nums text-whiskey-800">
                    {year}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-right font-medium text-whiskey-800">
                  Turras
                </th>
              </tr>
            </thead>
            {groups.map(({ group, rows }) => (
              <tbody key={group}>
                <tr>
                  <th colSpan={years.length + 2} scope="colgroup" className="sticky left-0 bg-surface px-2 pb-1 pt-5 text-left">
                    <span className="font-serif text-base font-bold text-whiskey-950">{GLOSSARY_GROUPS[group]}</span>
                  </th>
                </tr>
                {rows.map(({ concept, counts }) => {
                  const active = concept.slug === selected;
                  return (
                    <tr key={concept.slug} className="group">
                      <th scope="row" className="sticky left-0 z-10 bg-surface p-0 text-left font-normal">
                        <button
                          type="button"
                          onClick={() => select(concept.slug)}
                          aria-pressed={active}
                          className={`w-full whitespace-nowrap rounded-md px-2 py-1.5 text-left transition-colors hover:bg-whiskey-100 ${
                            active ? "bg-whiskey-100 font-semibold text-brand" : "text-whiskey-950"
                          }`}
                        >
                          {concept.term}
                        </button>
                      </th>
                      {counts.map((count, index) => (
                        <td key={years[index]} className="p-0">
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => select(concept.slug)}
                            aria-label={`${concept.term} en ${years[index]}: ${count} ${count === 1 ? "turra" : "turras"}`}
                            title={`${concept.term} en ${years[index]}: ${count} ${count === 1 ? "turra" : "turras"}`}
                            style={cellStyle(count)}
                            className={`block h-8 w-full rounded text-xs tabular-nums transition-shadow ${
                              count === 0 ? "bg-whiskey-100/50" : ""
                            } ${active ? "ring-2 ring-brand" : "group-hover:ring-1 group-hover:ring-whiskey-400"}`}
                          >
                            {count > 0 ? count : ""}
                          </button>
                        </td>
                      ))}
                      <td className="px-2 text-right tabular-nums text-whiskey-800">{concept.threads.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-whiskey-800">
          Turras ese año:
          {STEPS.map((step) => (
            <span key={step.from} className="inline-flex items-center gap-1">
              <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: step.bg }} />
              {step.label}
            </span>
          ))}
        </p>
      </div>

      <div ref={detail} className="scroll-mt-20">
        <div className="lg:sticky lg:top-20">
          {current ? (
            <ConceptDetail concept={current} concepts={concepts} threads={threads} years={years} onSelect={select} />
          ) : (
            <p className="rounded-xl border border-dashed border-whiskey-300 p-5 text-whiskey-800">
              Pulsa un concepto para ver en qué turras aparece y con qué otras ideas se cruza.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
