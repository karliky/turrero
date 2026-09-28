import type { ThreadSummary } from "@/lib/types";
import { formatDate, formatMonthYear } from "@/lib/archive";
import Tooltip from "./Tooltip";

interface CategoryCardProps {
  title: string;
  /** Page with the full list. */
  href: string;
  linkLabel: string;
  threads: ThreadSummary[];
  /** Show engagement numbers in the tooltip. */
  showStats?: boolean;
}

export function CategoryCard({ title, href, linkLabel, threads, showStats = false }: CategoryCardProps) {
  return (
    <div className="bg-surface rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <h2 className="text-xl font-bold mb-3 text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
        <a href={href} className="hover:underline">
          {title}
        </a>
      </h2>

      <ul className="flex-1 space-y-0.5">
        {threads.map((thread) => (
          <li
            key={thread.id}
            className="py-1 px-2 rounded-md flex items-baseline gap-2 hover:bg-whiskey-50 transition-colors"
          >
            <span className="shrink-0 w-16 text-xs tabular-nums text-whiskey-700">
              {showStats ? (
                <Tooltip
                  label={formatMonthYear(thread.publishedAt)}
                  content={`Publicada el ${formatDate(thread.publishedAt)}. ${thread.stats.likes} likes, ${thread.stats.retweets} retweets, ${thread.stats.quotes} citas`}
                />
              ) : (
                <time dateTime={thread.publishedAt}>{formatMonthYear(thread.publishedAt)}</time>
              )}
            </span>
            <a
              href={`/turra/${thread.id}`}
              className="text-whiskey-800 hover:text-whiskey-900 text-sm transition-colors duration-200 hover:underline line-clamp-2"
            >
              {thread.title}
            </a>
          </li>
        ))}
      </ul>

      <div className="pt-3 mt-2 border-t border-whiskey-100">
        <a
          href={href}
          className="inline-flex items-center text-whiskey-700 hover:text-whiskey-900 text-sm font-medium group-hover:translate-x-1 transition-all duration-200"
        >
          {linkLabel}
        </a>
      </div>
    </div>
  );
}
