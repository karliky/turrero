import Link from "next/link";
import { engagement, formatDate, formatDayMonth, groupByYear } from "@/lib/archive";
import type { ArchiveThread } from "@/lib/types";

interface ThreadRowsProps {
  threads: ArchiveThread[];
  /** Group under year headings (chronological orders); otherwise a flat list with full dates. */
  grouped: boolean;
  showAuthor: boolean;
  categoryNames: Record<string, string>;
}

function Row({ thread, grouped, showAuthor, categoryNames }: Omit<ThreadRowsProps, "threads"> & { thread: ArchiveThread }) {
  const meta = [
    showAuthor ? thread.authorName : null,
    thread.categories.map((slug) => categoryNames[slug] ?? slug).join(", ") || null,
    grouped ? null : `${engagement(thread.stats).toLocaleString("es-ES")} interacciones`,
  ].filter(Boolean);

  return (
    <li className="flex items-baseline gap-4 py-2.5">
      <time dateTime={thread.publishedAt} className={`shrink-0 text-sm tabular-nums text-whiskey-700 ${grouped ? "w-16" : "w-24"}`}>
        {grouped ? formatDayMonth(thread.publishedAt) : formatDate(thread.publishedAt)}
      </time>
      <div className="min-w-0">
        <Link href={`/turra/${thread.id}`} className="text-whiskey-900 hover:text-brand hover:underline">
          {thread.title}
        </Link>
        {meta.length > 0 && <p className="mt-0.5 text-xs text-whiskey-700">{meta.join(" · ")}</p>}
      </div>
    </li>
  );
}

/** Compact list of turras, grouped by year. Renders on the server (static fallback) and inside the filters. */
export function ThreadRows({ threads, grouped, ...rowProps }: ThreadRowsProps) {
  if (threads.length === 0) {
    return <p className="py-8 text-center text-whiskey-700">No hay turras con estos filtros.</p>;
  }

  if (!grouped) {
    return (
      <ol className="divide-y divide-whiskey-100">
        {threads.map((thread) => (
          <Row key={thread.id} thread={thread} grouped={false} {...rowProps} />
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-8">
      {groupByYear(threads).map(({ year, threads: yearThreads }) => (
        <section key={year} aria-labelledby={`anio-${year}`}>
          <h2 id={`anio-${year}`} className="flex items-baseline gap-2 border-b-2 border-whiskey-200 pb-1 text-xl font-bold text-whiskey-900">
            {year}
            <span className="text-sm font-normal text-whiskey-700">
              {yearThreads.length} {yearThreads.length === 1 ? "turra" : "turras"}
            </span>
          </h2>
          <ol className="divide-y divide-whiskey-100">
            {yearThreads.map((thread) => (
              <Row key={thread.id} thread={thread} grouped {...rowProps} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
