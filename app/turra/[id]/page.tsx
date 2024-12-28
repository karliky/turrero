import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft } from "react-icons/fa";
import { TweetProvider, Tweet } from "../../../infrastructure/TweetProvider";
import { TweetContent } from "../../components/TweetContent";
import { Metadata } from 'next';

interface Params {
  params: {
    id: string;
  };
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const summary = getTweetSummary(id);
  
  return {
    title: `${summary} - El Turrero Post`,
  };
}

export default async function TurraPage({ params }: Params) {
  const { id } = await params;

  const thread = await getTweetById(id);

  if (!thread || thread.length === 0) {
    notFound();
  }

  const mainTweet = thread[0];
  const summary = getTweetSummary(mainTweet.id);
  const words = summary.split(' ');
  const coloredWords = words.slice(0, 2).join(' ');
  const remainingWords = words.slice(2).join(' ');

  return (
    <main className="min-h-screen">
      {/* Back Navigation */}
      <nav className="border-whiskey-200">
        <div className="container mx-auto px-4 py-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-whiskey-700 hover:text-whiskey-900 transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            <span className="font-medium">Volver</span>
          </a>
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

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="top-4 space-y-4">
              {/* Related Books Card */}
              <div className="bg-white border border-whiskey-200 rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 text-whiskey-900">
                  Libros relacionados
                </h2>
                <ul className="list-disc list-inside space-y-3">
                  <li className="flex flex-col">
                    <a
                      href="https://www.goodreads.com/book/show/28570175-the-fourth-industrial-revolution"
                      className="group"
                    >
                      <h3 className="text-sm font-medium text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
                        The Fourth Industrial Revolution
                      </h3>
                      <p className="text-xs text-whiskey-700">Klaus Schwab</p>
                    </a>
                  </li>
                  <li className="flex flex-col">
                    <a
                      href="https://www.goodreads.com/book/show/22928874-rise-of-the-robots"
                      className="group"
                    >
                      <h3 className="text-sm font-medium text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
                        Rise of the Robots: Technology and the Threat of a
                        Jobless Future
                      </h3>
                      <p className="text-xs text-whiskey-700">Martin Ford</p>
                    </a>
                  </li>
                  <li className="flex flex-col">
                    <a
                      href="https://www.goodreads.com/book/show/23316526-the-second-machine-age"
                      className="group"
                    >
                      <h3 className="text-sm font-medium text-whiskey-900 group-hover:text-whiskey-700 transition-colors">
                        The Second Machine Age: Work, Progress, and Prosperity
                        in a Time of Brilliant Technologies
                      </h3>
                      <p className="text-xs text-whiskey-700">
                        Erik Brynjolfsson & Andrew McAfee
                      </p>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Quiz Card */}
              <div className="bg-white border border-whiskey-200 rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-4 text-whiskey-900">
                  Pon en práctica tu comprensión
                </h2>
                <div className="space-y-4">
                  {/* Question 1 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-whiskey-800">
                      1. ¿Qué porcentaje de la fuerza laboral podría verse
                      afectada?
                    </p>
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q1"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          a) 50% de la fuerza laboral
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q1"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          b) 80% con al menos 10% de tareas
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q1"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          c) 100% de los trabajadores
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-whiskey-800">
                      2. ¿Qué habilidades son menos propensas a verse afectadas?
                    </p>
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q2"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          a) Programación y escritura
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q2"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          b) Científicas y pensamiento crítico
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q2"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          c) Habilidades manuales
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Question 3 */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-whiskey-800">
                      3. ¿Qué áreas son más susceptibles al impacto?
                    </p>
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q3"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          a) Manufactura y producción
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q3"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          b) Programación y escritura
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="q3"
                          className="text-whiskey-600"
                        />
                        <span className="text-sm text-gray-600">
                          c) Ventas y marketing
                        </span>
                      </label>
                    </div>
                  </div>

                  <button className="w-full py-2 px-4 bg-whiskey-600 text-white rounded-lg hover:bg-whiskey-700 transition-colors font-medium">
                    Comprobar resultados
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
