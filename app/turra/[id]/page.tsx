import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft } from "react-icons/fa";
import { TweetProvider, Tweet } from "../../../infrastructure/TweetProvider";
import { TweetContent } from "../../components/TweetContent";
import { Metadata } from 'next';
import Link from 'next/link';
import { TurraSidebar } from '../../components/TurraSidebar';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

async function getTweetById(id: string): Promise<Tweet[]> {
  const tweetProvider = new TweetProvider();
  const allThreads = tweetProvider.getAllTweets();
  // Find the thread that contains the tweet with the given ID
  const thread = allThreads.find(thread => 
    thread.some(tweet => tweet.id === id)
  );
  return thread || [];
}

function getTweetSummary(id: string): string {
  return new TweetProvider().getSummaryById(id);
}

function getTweetCategories(id: string): string[] {
  return new TweetProvider().getCategoryById(id);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

function getTweetExam(id: string) {
  return new TweetProvider().getExamById(id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const summary = getTweetSummary(id);
  
  return {
    title: `${summary} - El Turrero Post`,
  };
}

export default async function TurraPage({ params }: Params) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const thread = await getTweetById(id);

  if (!thread || thread.length === 0) {
    notFound();
  }

  const mainTweet = thread[0];
  const summary = getTweetSummary(mainTweet.id);
  const exam = getTweetExam(mainTweet.id);
  const words = summary.split(' ');
  const coloredWords = words.slice(0, 2).join(' ');
  const remainingWords = words.slice(2).join(' ');

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
              href={`https://twitter.com/Recuenco/status/${mainTweet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-whiskey-700 hover:text-whiskey-900 font-medium"
            >
              Leer en Twitter
            </a>
          </div>

          {/* Add categories section */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-whiskey-600">Categoría(s) de esta turra:</span>
            {getTweetCategories(mainTweet.id).map((category, index) => (
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
