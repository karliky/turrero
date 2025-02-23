import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft } from "react-icons/fa";
import { TweetProvider } from "../../../infrastructure/TweetProvider";
import { TweetContent } from "../../components/TweetContent";
import { Metadata } from 'next';
import Link from 'next/link';
import { TurraSidebar } from '../../components/TurraSidebar';
import { AUTHORS, Author, fromXtoAuthor } from "@/infrastructure/constants";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

async function getTweetData(id: string) {
  const tweetProvider = new TweetProvider();
  const thread = tweetProvider.getAllTweets().find(thread => 
    thread.some(tweet => tweet.id === id)
  ) || [];
  
  if (thread.length === 0) return null;
  
  const mainTweet = thread[0];
  return {
    thread,
    summary: tweetProvider.getSummaryById(mainTweet.id),
    categories: tweetProvider.getCategoryById(mainTweet.id),
    exam: tweetProvider.getExamById(mainTweet.id),
    author: mainTweet.author,
  };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const data = await getTweetData(id);
  
  if (!data) {
    return {
      title: 'Not Found',
    };
  }

  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `${data.summary} - El Turrero Post - Las turras de ${AUTHORS.MAIN}`,
    description: data.summary,
    openGraph: {
      title: data.summary,
      description: data.summary,
      images: [ogImageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.summary,
      description: data.summary,
      images: [ogImageUrl],
    }
  };
}

export async function generateStaticParams() {
  const tweetProvider = new TweetProvider();
  const allThreads = tweetProvider.getAllTweets();
  
  return allThreads.map(thread => ({
    id: thread[0].id
  }));
}

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default async function TurraPage({ params }: Params) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const data = await getTweetData(id);

  if (!data) {
    notFound();
  }

  const { thread, summary, categories, exam } = data;
  const mainTweet = thread[0];
  const words = summary.split(' ');
  const coloredWords = words.slice(0, 2).join(' ');
  const remainingWords = words.slice(2).join(' ');
  const author: Author = fromXtoAuthor(mainTweet.author);
  return (
    <main className="min-h-screen">
      {/* Back Navigation */}
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
        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-whiskey-900 leading-tight">
            <span style={{ color: '#a5050b' }}>{coloredWords}</span>{' '}
            {remainingWords}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-whiskey-600 mb-3">
            <span>Por{" "}
            <a
              href={author.X}
              target="_blank"
              rel="noopener noreferrer"
              className="text-whiskey-700 hover:text-whiskey-900 font-medium"
            >
                {author.NAME} 
             </a>
             </span>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <time>
              Publicado el{" "}
              {format(new Date(mainTweet.time), "d 'de' MMMM, yyyy", { locale: es })}
            </time>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <span>
              {Math.max(1, Math.ceil(
                thread.reduce((wordCount, tweet) => 
                  wordCount + tweet.tweet.split(/\s+/).length, 0) / 200
              ))} min de lectura
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-whiskey-300" />
            <a
              href={`${mainTweet.author}/status/${mainTweet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-whiskey-700 hover:text-whiskey-900 font-medium"
            >
              Leer en X.com
            </a>
          </div>

          {/* Add categories section */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-whiskey-600">Categoría(s) de esta turra:</span>
            {categories.map((category, index) => (
              <a
                key={index}
                href={`/${normalizeText(category)}`}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-whiskey-100 text-whiskey-800 hover:bg-whiskey-200 transition-colors"
              >
                {category}
              </a>
            ))}
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
          {/* Article Content */}
          <article className="lg:col-span-8 prose prose-whiskey max-w-none">
            <div className="space-y-6">
              {thread.map((tweet) => (
                <TweetContent 
                  key={tweet.id} 
                  tweet={tweet}
                  id={tweet.id}
                />
              ))}
            </div>
          </article>

          <TurraSidebar exam={exam} thread={thread} />
        </div>
      </div>
    </main>
  );
}
