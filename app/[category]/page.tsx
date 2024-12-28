import { TweetFacade } from "../../infrastructure";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from 'next/link';

const ITEMS_PER_PAGE = 20;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "resolucion-de-problemas-complejos":
    "CPS son las siglas de Complex Problem Solving o Resolución de Problemas Complejos, CPS integra conceptos y valores para desafíos que exigen algo más que la experiencia habitual. No es un método rígido, sino una forma flexible de pensar y actuar.",
  "factor-x":
    "El Factor X abarca elementos humanos difíciles de detectar que influyen en sistemas y organizaciones. Su singularidad puede ser decisiva en entornos cambiantes.",
  personotecnia:
    "La personotecnia reúne métodos y recursos para crear mensajes muy personalizados. Busca perfilar con más detalle a cada cliente, ofreciendo productos y servicios hechos a su medida.",
  "sistemas-complejos":
    "Un sistema complejo es un conjunto de partes interrelacionadas que genera comportamientos inesperados al interactuar. Se adapta y evoluciona con el tiempo, como ecosistemas o redes sociales.",
  marketing:
    "El marketing aplicado a problemas complejos analiza diversas variables y propone soluciones con visión amplia. Implica entender el mercado, el entorno y la competencia para adaptarse a los cambios.",
  estrategia:
    "La estrategia, según Richard Rumelt, es elegir prioridades y descartar otras opciones para alcanzar metas claras. Busca ventajas competitivas y alinea recursos donde más conviene.",
  sociologia:
    "La sociología estudia interacciones y estructuras que conforman la sociedad, abordando problemas sociales complejos y proponiendo mejoras para la convivencia y el bienestar común.",
  "gestion-del-talento":
    "La gestión del talento identifica, desarrolla y retiene habilidades clave. Alinea el potencial de la gente con los objetivos de la empresa y crea equipos preparados para encarar desafíos.",
  "leyes-y-sesgos":
    "Leyes y sesgos señalan las reglas de los sistemas y los patrones que distorsionan las decisiones. Reconocerlos ayuda a evitar errores y a tomar mejores determinaciones.",
  "trabajo-en-equipo":
    "El trabajo en equipo reúne talentos y perspectivas distintas para encarar retos complejos. Fomenta comunicación, coordinación y creatividad compartida, logrando soluciones que no se conseguirían en solitario.",
  libros: "Turras que incluyen libros relacionados con el ámbito CPS.",
  "futurismo-de-frontera":
    "El futurismo de frontera explora tendencias emergentes y aplica innovaciones que aportan valor a las empresas al enfrentar problemas complejos.",
  "orquestacion-cognitiva":
    "La orquestación cognitiva es un liderazgo que conecta y coordina a las personas, dentro o fuera de la organización, para enfrentar problemas complejos.",
  gaming:
    "El Gaming en el ámbito CPS impulsa creatividad, estrategia y trabajo conjunto.",
  "lectura-de-senales":
    "La lectura de señales busca captar indicios clave para anticipar tendencias y abordar problemas complejos.",
  "el-contexto-manda":
    "Según Alicia Juarrero, el contexto determina cómo se afrontan los problemas complejos. Entenderlo es clave para tomar decisiones acertadas y adaptarse a los cambios.",
  "desarrollo-de-habilidades":
    "El desarrollo de habilidades potencia las capacidades personales y colectivas para afrontar y resolver problemas complejos.",
  "otras-turras-del-querer":
    "Otras turras que no encajan en categorías específicas.",
};

interface Params {
  params: {
    category: string;
    page?: string;
  };
  searchParams: {
    page?: string;
  };
}

function normalizeCategory(category: string): string {
  return category.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatCategoryForComparison(category: string): string {
  return category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const categoryName = normalizeCategory(category);

  return {
    title: `${categoryName} - El Turrero Post`,
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params;
  const { page } = await searchParams;
  const tweetFacade = new TweetFacade();
  const currentPage = Number(page) || 1;

  // Find matching category by comparing normalized versions
  const originalCategory = tweetFacade
    .getCategories()
    .find(
      (cat) =>
        formatCategoryForComparison(cat) ===
        formatCategoryForComparison(category)
    );

  // Verify category exists
  if (!originalCategory) {
    notFound();
  }

  const tweets = await tweetFacade.tweetProvider.getTweetsByCategory(
    originalCategory
  );
  const totalTweets = tweets.length;
  const totalPages = Math.ceil(totalTweets / ITEMS_PER_PAGE);

  // Get paginated tweets
  const paginatedTweets = tweets
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-block mb-6 text-whiskey-600 hover:text-whiskey-800 transition-colors"
        >
          ← Volver al inicio
        </Link>

        <h1 className="text-2xl font-semibold text-whiskey-900 mb-2">
          {normalizeCategory(category)}
          <span className="ml-2 text-sm font-normal text-whiskey-600">
            ({totalTweets.toLocaleString()}{" "}
            {totalTweets === 1 ? "turra" : "turras"})
          </span>
        </h1>

        {CATEGORY_DESCRIPTIONS[category] && (
          <p className="text-sm text-whiskey-600 ">
            {CATEGORY_DESCRIPTIONS[category]}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {paginatedTweets.map((tweet) => {
          const summary = tweetFacade.tweetProvider.getSummaryById(tweet.id);
          return (
            <article
              key={tweet.id}
              className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <time className="block text-sm text-whiskey-500 mb-3">
                {format(new Date(tweet.time), "d 'de' MMMM, yyyy", {
                  locale: es,
                })}
              </time>
              <Link
                href={`/turra/${tweet.id}`}
                className="block text-whiskey-800 mb-3 line-clamp-3 hover:text-whiskey-600"
              >
                {summary}
              </Link>
              <Link
                href={`/turra/${tweet.id}`}
                className="inline-flex items-center text-whiskey-600 hover:text-whiskey-800 font-medium"
              >
                Leer más <span className="ml-1">→</span>
              </Link>
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={`/${category}?page=${page}`}
              className={`px-3 py-2 rounded ${
                currentPage === page
                  ? "bg-whiskey-600 text-white"
                  : "bg-white text-whiskey-600 hover:bg-whiskey-100 transition-colors"
              }`}
            >
              {page}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
