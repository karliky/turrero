"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ALL_AUTHORS,
  ORDERS,
  countByYear,
  filterThreads,
  filtersToQuery,
  parseFilters,
  type ArchiveFilters,
  type Order,
} from "@/lib/archive";
import type { ArchiveThread } from "@/lib/types";
import { ThreadRows } from "./ThreadRows";

export interface ThreadFiltersProps {
  threads: ArchiveThread[];
  categoryNames: Record<string, string>;
  /** Enables the category filter. */
  categories?: { slug: string; name: string }[];
  /** Enables the author filter. */
  authors?: { handle: string; name: string; threads: number }[];
  defaultAuthor?: string | null;
  showAuthor?: boolean;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

/** Native select (keyboard and mobile pickers for free) with its own arrow so it looks the same everywhere. */
function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-whiskey-700">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none truncate rounded-lg border border-whiskey-200 bg-whiskey-50/60 pl-3 pr-10 text-sm text-whiskey-950 transition-colors hover:border-whiskey-300 focus:border-whiskey-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-whiskey-200"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-whiskey-700"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </label>
  );
}

/** Year, category, author and order filters over a list of turras. The state lives in the URL. */
export function ThreadFilters({ threads, categoryNames, categories, authors, defaultAuthor = null, showAuthor = false }: ThreadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(new URLSearchParams(useSearchParams().toString()), defaultAuthor);
  const years = countByYear(threads, filters);
  const results = filterThreads(threads, filters);
  const isDefault = filtersToQuery(filters, defaultAuthor) === "";

  const update = (change: Partial<ArchiveFilters>) => {
    router.push(`${pathname}${filtersToQuery({ ...filters, ...change }, defaultAuthor)}`, { scroll: false });
  };

  const fields: SelectProps[] = [
    {
      label: "Año",
      value: filters.year ?? "",
      onChange: (value) => update({ year: value || null }),
      options: [{ value: "", label: "Todos los años" }, ...years.map(([year, count]) => ({ value: year, label: `${year} (${count})` }))],
    },
    ...(categories
      ? [
          {
            label: "Categoría",
            value: filters.category ?? "",
            onChange: (value: string) => update({ category: value || null }),
            options: [{ value: "", label: "Todas las categorías" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))],
          },
        ]
      : []),
    ...(authors
      ? [
          {
            label: "Autor",
            value: filters.author ?? ALL_AUTHORS,
            onChange: (value: string) => update({ author: value === ALL_AUTHORS ? null : value }),
            options: [
              { value: ALL_AUTHORS, label: "Todos los autores" },
              ...authors.map((a) => ({ value: a.handle, label: a.name })),
            ],
          },
        ]
      : []),
    {
      label: "Orden",
      value: filters.order,
      onChange: (value) => update({ order: value as Order }),
      options: Object.entries(ORDERS).map(([value, label]) => ({ value, label })),
    },
  ];

  return (
    <>
      <form
        role="search"
        aria-label="Filtrar turras"
        onSubmit={(e) => e.preventDefault()}
        className="mb-8 rounded-xl border border-whiskey-200 bg-surface p-4 shadow-xs sm:p-5"
      >
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${fields.length > 2 ? "lg:grid-cols-4" : ""}`}>
          {fields.map((field) => (
            <Select key={field.label} {...field} />
          ))}
        </div>

        <div className="mt-4 flex min-h-9 items-center justify-between gap-4 border-t border-whiskey-100 pt-4">
          <p className="text-sm text-whiskey-800" aria-live="polite">
            <strong className="font-semibold text-whiskey-950">{results.length}</strong>{" "}
            {results.length === 1 ? "turra" : "turras"}
          </p>
          {!isDefault && (
            <button
              type="button"
              onClick={() => update({ year: null, category: null, author: defaultAuthor, order: "recientes" })}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-whiskey-800 transition-colors hover:bg-whiskey-50 hover:text-whiskey-950"
            >
              <span aria-hidden="true">×</span> Quitar filtros
            </button>
          )}
        </div>
      </form>

      <ThreadRows
        threads={results}
        grouped={filters.order !== "interaccion"}
        // With one author selected, the name on every row is noise
        showAuthor={showAuthor && !filters.author}
        categoryNames={categoryNames}
      />
    </>
  );
}
