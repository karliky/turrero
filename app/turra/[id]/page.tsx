import { notFound, permanentRedirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft } from "react-icons/fa";
import type { Metadata } from 'next';
import Link from 'next/link';
import { TweetContent } from "../../components/TweetContent";
import { TurraSidebar } from '../../components/TurraSidebar';
import { createLinker } from "@/lib/glossary-links";
import { getAdjacentThreads, getThread, getThreadCitations, getThreadIdOfTweet, listGlossary, listThreadIds } from "@/lib/queries";
import { tweetUrl } from "@/lib/site";
import { readingMinutes } from "@/lib/text";
import { articleLd, breadcrumbLd } from "@/lib/structured-data";
import type { Thread } from "@/lib/types";
import { JsonLd } from "../../components/JsonLd";
import { pageMetadata, turraDescription } from "@/lib/seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return listThreadIds().map((id) => ({ id }));
}

/** Search description; also used by the Article structured data. */
function describe(thread: Thread): string {
  return turraDescription({
    title: thread.title,
    opening: thread.tweets[0]?.text ?? '',
    // The glossary term this turra is the main source of, if any
    term: listGlossary().find((entry) => entry.sources[0]?.threadId === thread.id) ?? null,
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const thread = getThread((await params).id);
  if (!thread) return { title: 'Not Found' };

  // Shared as an article; og:image and twitter:image come from the colocated opengraph-image.tsx
  return pageMetadata({
    title: `${thread.title}, por ${thread.author.name}`,
    // The opening of the turra says more than repeating its title
    description: describe(thread),
    path: `/turra/${thread.id}`,
    ownImage: true,
    article: {
      publishedTime: thread.publishedAt,
      author: thread.author.name,
      authorHandle: thread.author.handle,
      section: thread.categories[0]?.name ?? null,
    },
  });
}

export default async function TurraPage({ params }: Params) {
  const { id } = await params;
  const thread = getThread(id);
  if (!thread) {
    // Old URLs could point to any tweet of a thread
    const threadId = getThreadIdOfTweet(id);
    if (threadId) permanentRedirect(`/turra/${threadId}#${id}`);
    notFound();
  }

  const words = thread.title.split(' ');
  const highlightedWords = words.slice(0, 2).join(' ');
  const remainingWords = words.slice(2).join(' ');
  const minutes = readingMinutes(thread.tweets.map((tweet) => tweet.text));
  const { previous, next } = getAdjacentThreads(thread.id);

  // Glossary terms are linked once per turra, at their first appearance
  const glossary = listGlossary();
  const bySlug = new Map(glossary.map((entry) => [entry.slug, entry]));
  const linker = createLinker(glossary.map((entry) => ({ slug: entry.slug, names: [entry.term, ...entry.aliases] })));
  const termsByTweet = new Map(
    thread.tweets.map((tweet) => [
      tweet.id,
      linker.find(tweet.text).map((match) => ({ ...match, term: bySlug.get(match.slug)!.term, short: bySlug.get(match.slug)!.short })),
    ]),
  );

  const section = thread.categories[0] ?? null;
  return (
    <main className="min-h-screen">
      <JsonLd
        data={[
          articleLd({
            id: thread.id,
            title: thread.title,
            description: describe(thread),
            publishedAt: thread.publishedAt,
            author: { name: thread.author.name, handle: thread.author.handle },
            section: section?.name ?? null,
          }),
          breadcrumbLd([
            ...(section ? [[section.name, `/${section.slug}`] as [string, string]] : []),
            [thread.title, `/turra/${thread.id}`],
          ]),
        ]}
      />
      <nav className="border-whiskey-200">
        <div className="container mx-auto px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-whiskey-700 hover:text-whiskey-900 transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="font-medium">Volver</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-2 pb-8 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-whiskey-900 leading-tight">
            <span className="text-brand">{highlightedWords}</span>{' '}
            {remainingWords}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-whiskey-700 mb-3">
            <span>
              Por{" "}
              <Link href={`/autor/${thread.author.handle}`} className="text-whiskey-700 hover:text-whiskey-900 font-medium">
                {thread.author.name}
              </Link>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <time dateTime={thread.publishedAt}>
              Publicado el{" "}
              {format(new Date(thread.publishedAt), "d 'de' MMMM, yyyy", { locale: es })}
            </time>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <span>{minutes} min de lectura</span>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <a
              href={tweetUrl(thread.author.handle, thread.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-whiskey-700 hover:text-whiskey-900 font-medium"
            >
              Leer en X.com
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-whiskey-700">Categoría(s) de esta turra:</span>
            {thread.categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${category.slug}`}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-whiskey-100 text-whiskey-800 hover:bg-whiskey-200 transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
          <div className="lg:col-span-8">
            <article className="max-w-[62ch]">
              <div className="space-y-6">
                {thread.tweets.map((tweet) => (
                  <TweetContent key={tweet.id} tweet={tweet} terms={termsByTweet.get(tweet.id) ?? []} />
                ))}
              </div>
            </article>

            <nav aria-label="Otras turras" className="mt-12 grid max-w-[62ch] gap-4 border-t border-whiskey-200 pt-6 sm:grid-cols-2">
              {previous && (
                <Link href={`/turra/${previous.id}`} className="group block">
                  <span className="text-sm text-whiskey-700">← Turra anterior</span>
                  <span className="mt-1 block font-medium text-whiskey-900 group-hover:underline">{previous.title}</span>
                </Link>
              )}
              {next && (
                <Link href={`/turra/${next.id}`} className="group block sm:col-start-2 sm:text-right">
                  <span className="text-sm text-whiskey-700">Turra siguiente →</span>
                  <span className="mt-1 block font-medium text-whiskey-900 group-hover:underline">{next.title}</span>
                </Link>
              )}
            </nav>
          </div>

          <TurraSidebar thread={thread} citations={getThreadCitations(thread.id)} />
        </div>
      </div>
    </main>
  );
}
