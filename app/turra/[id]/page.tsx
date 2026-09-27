import { notFound, permanentRedirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft } from "react-icons/fa";
import type { Metadata } from 'next';
import Link from 'next/link';
import { TweetContent } from "../../components/TweetContent";
import { TurraSidebar } from '../../components/TurraSidebar';
import { getThread, getThreadIdOfTweet, listThreadIds } from "@/lib/queries";
import { SITE, tweetUrl } from "@/lib/site";

interface Params {
  params: Promise<{ id: string }>;
}

const WORDS_PER_MINUTE = 200;

export function generateStaticParams() {
  return listThreadIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const thread = getThread((await params).id);
  if (!thread) return { title: 'Not Found' };

  // og:image and twitter:image come from the colocated opengraph-image.tsx
  return {
    title: `${thread.title} — ${thread.author.name} | ${SITE.name}`,
    description: thread.title,
    openGraph: {
      title: thread.title,
      description: thread.title,
    },
    twitter: {
      card: 'summary_large_image',
      title: thread.title,
      description: thread.title,
    },
  };
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
  const wordCount = thread.tweets.reduce((total, tweet) => total + tweet.text.split(/\s+/).length, 0);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return (
    <main className="min-h-screen">
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-whiskey-600 mb-3">
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
            <span>{readingMinutes} min de lectura</span>
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
            <span className="text-sm text-whiskey-600">Categoría(s) de esta turra:</span>
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
          <article className="lg:col-span-8 prose prose-whiskey max-w-none">
            <div className="space-y-6">
              {thread.tweets.map((tweet) => (
                <TweetContent key={tweet.id} tweet={tweet} />
              ))}
            </div>
          </article>

          <TurraSidebar thread={thread} />
        </div>
      </div>
    </main>
  );
}
