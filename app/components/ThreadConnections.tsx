import Link from "next/link";
import type { ThreadSummary } from "@/lib/types";

interface ThreadConnectionsProps {
  cites: ThreadSummary[];
  citedBy: ThreadSummary[];
}

function List({ title, threads }: { title: string; threads: ThreadSummary[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-whiskey-800">{title}</h3>
      <ul className="space-y-2">
        {threads.map((thread) => (
          <li key={thread.id} className="leading-snug">
            <Link href={`/turra/${thread.id}`} className="text-whiskey-950 hover:text-brand">
              {thread.title}
            </Link>{" "}
            <span className="text-sm tabular-nums text-whiskey-700">{thread.publishedAt.slice(0, 4)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Turras this one quotes and turras that quote it (see /mapa-de-ideas). */
export function ThreadConnections({ cites, citedBy }: ThreadConnectionsProps) {
  if (cites.length === 0 && citedBy.length === 0) return null;
  return (
    <section className="rounded-xl border border-whiskey-200 border-t-[3px] border-t-brand bg-surface p-5 shadow-sm">
      <h2 className="font-serif text-xl font-bold text-whiskey-950">Relación con otras turras</h2>
      <div className="mt-4 space-y-5">
        {cites.length > 0 && <List title="Se apoya en" threads={cites} />}
        {citedBy.length > 0 && <List title="La citan después" threads={citedBy} />}
      </div>
    </section>
  );
}
