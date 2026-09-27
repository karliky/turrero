import type { ThreadSummary } from "@/lib/types";
import Tooltip from "./Tooltip";

interface CategoryCardProps {
  title: string;
  /** Link to the full list; omitted for lists that have no page of their own. */
  href?: string;
  threads: ThreadSummary[];
  /** Show engagement numbers in the tooltip. */
  showStats?: boolean;
}

function formatRelativeTime(dateString: string, fullText: boolean = false): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 7) {
    return fullText
      ? `${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`
      : `${diffInDays}d`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return fullText
      ? `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
      : `${weeks}s`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return fullText
      ? `${months} ${months === 1 ? 'mes' : 'meses'}`
      : `${months}m`;
  } else {
    const years = Math.floor(diffInDays / 365);
    const remainingDays = diffInDays % 365;
    const remainingMonths = Math.floor(remainingDays / 30);

    if (fullText) {
      let result = `${years} ${years === 1 ? 'año' : 'años'}`;
      if (remainingMonths > 0) {
        result += ` y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`;
      }
      return result;
    }

    return `${years}a`;
  }
}

export function CategoryCard({ title, href, threads, showStats = false }: CategoryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow duration-300 flex flex-col min-h-[400px] group">
      <h2 className="text-xl font-bold mb-3 text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
        {href ? (
          <a href={href} className="hover:underline">
            {title}
          </a>
        ) : (
          title
        )}
      </h2>

      <div className="relative flex-1 min-h-0">
        <div
          className="absolute inset-0 space-y-0.5 overflow-y-auto pr-2 no-scrollbar"
          style={{
            msOverflowStyle: 'none',  /* IE and Edge */
            scrollbarWidth: 'none'    /* Firefox */
          }}
        >
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="py-1 px-2 rounded-md flex items-baseline gap-2 hover:bg-whiskey-50 transition-colors"
            >
              <div className="inline-block shrink-0">
                <Tooltip
                  label={formatRelativeTime(thread.publishedAt)}
                  content={showStats
                    ? `Turra publicada hace ${formatRelativeTime(thread.publishedAt, true)}. (${thread.stats.likes} likes, ${thread.stats.retweets} retweets, ${thread.stats.quotes} quotetweets)`
                    : `Turra publicada hace ${formatRelativeTime(thread.publishedAt, true)}`
                  }
                />
              </div>
              <a
                href={`/turra/${thread.id}`}
                className="text-gray-700 hover:text-whiskey-900 text-sm transition-colors duration-200 hover:underline line-clamp-2"
              >
                {thread.title}
              </a>
            </div>
          ))}
        </div>
      </div>

      {href && (
        <div className="pt-3 mt-2 border-t border-whiskey-100">
          <a
            href={href}
            className="inline-flex items-center text-whiskey-600 hover:text-whiskey-800 text-sm font-medium group-hover:translate-x-1 transition-all duration-200"
          >
            Ver más <span className="ml-1.5">→</span>
          </a>
        </div>
      )}
    </div>
  );
}
