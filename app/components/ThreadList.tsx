import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ThreadSummary } from "@/lib/types";

interface ThreadListProps {
  title: string;
  description?: string;
  threads: ThreadSummary[];
  /** Show the author of each turra (useful when the list mixes authors). */
  showAuthor?: boolean;
  children?: React.ReactNode;
}

/** Page listing turras: used by categories and authors. */
export function ThreadList({ title, description, threads, showAuthor = false, children }: ThreadListProps) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
          <span className="ml-2">Volver al inicio</span>
        </Link>

        <h1 className="text-3xl font-bold text-whiskey-900 mb-3 mt-6">
          {title}
          <span className="ml-3 text-base font-medium text-whiskey-700 bg-whiskey-50 px-3 py-1 rounded-full">
            {threads.length.toLocaleString()} {threads.length === 1 ? "turra" : "turras"}
          </span>
        </h1>

        {description && (
          <p className="text-base text-whiskey-700 leading-relaxed bg-whiskey-50/50 p-4 rounded-lg border border-whiskey-100">
            {description}
          </p>
        )}
        {children}
      </div>

      <div className="space-y-6">
        {threads.map((thread) => (
          <article
            key={thread.id}
            className="bg-white rounded-lg p-6 shadow-xs hover:shadow-lg transition-all duration-200 border border-whiskey-100 hover:border-whiskey-200"
          >
            <p className="text-sm font-medium text-whiskey-600 mb-3">
              <time dateTime={thread.publishedAt}>
                {format(new Date(thread.publishedAt), "d 'de' MMMM, yyyy", { locale: es })}
              </time>
              {showAuthor && (
                <>
                  {" · "}
                  <Link href={`/autor/${thread.authorHandle}`} className="hover:text-whiskey-900">
                    {thread.authorName}
                  </Link>
                </>
              )}
            </p>
            <Link
              href={`/turra/${thread.id}`}
              className="block text-whiskey-900 mb-3 line-clamp-3 hover:text-whiskey-700 transition-colors duration-200"
            >
              {thread.title}
            </Link>
            <Link
              href={`/turra/${thread.id}`}
              className="inline-flex items-center text-whiskey-700 hover:text-whiskey-900 font-medium group"
            >
              Leer más
              <span className="ml-1 transform group-hover:translate-x-1 transition-transform duration-200">→</span>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
