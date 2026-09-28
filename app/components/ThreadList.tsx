import { Suspense } from "react";
import Link from "next/link";
import { filterThreads } from "@/lib/archive";
import { listCategories } from "@/lib/queries";
import { ThreadFilters, type ThreadFiltersProps } from "./ThreadFilters";
import { ThreadRows } from "./ThreadRows";

interface ThreadListProps extends Omit<ThreadFiltersProps, "categoryNames"> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Page listing turras with filters: the archive, categories and authors. */
export function ThreadList({ title, description, children, ...filterProps }: ThreadListProps) {
  const categoryNames = Object.fromEntries(listCategories().map((category) => [category.slug, category.name]));
  const { threads, defaultAuthor = null, showAuthor = false } = filterProps;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 group"
        >
          Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold text-whiskey-900 mb-3 mt-6">{title}</h1>

        {description && (
          <p className="text-base text-whiskey-800 leading-relaxed bg-whiskey-50/50 p-4 rounded-lg border border-whiskey-100">
            {description}
          </p>
        )}
        {children}
      </div>

      {/* The filters read the URL, so they render on the client; the static HTML carries the default list */}
      <Suspense
        fallback={
          <ThreadRows
            threads={filterThreads(threads, { year: null, category: null, author: defaultAuthor, order: "recientes" })}
            grouped
            showAuthor={showAuthor && !defaultAuthor}
            categoryNames={categoryNames}
          />
        }
      >
        <ThreadFilters {...filterProps} categoryNames={categoryNames} />
      </Suspense>
    </main>
  );
}
