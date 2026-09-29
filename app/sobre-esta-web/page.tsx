import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteStats, listAuthors, listBooks, listGlossary } from "@/lib/queries";
import { IMAGE_CREDITS, SITE, authorUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

const description = `Qué es ${SITE.name} y quién está detrás: el archivo de las turras de Javier G. Recuenco y la Comunidad CPS.`;

export const metadata: Metadata = pageMetadata({ title: "Sobre esta web", description, path: "/sobre-esta-web" });

interface Person {
  name: string;
  handle: string;
  /** Served from public/people, never from a third party (it would get the reader's IP). */
  photo: string;
  role: string;
  bio: string;
  /** Author page in the archive, for people who have written turras. */
  author?: string;
  /** Their own project, when it matters for who they are. */
  site?: { label: string; url: string };
}

// Bios written from what each person says about themselves, each in its own words: no shared template
const PEOPLE: Person[] = [
  {
    name: "Javier G. Recuenco",
    handle: "Recuenco",
    photo: "/people/recuenco.jpg",
    role: "Escribe las turras",
    bio: "Lleva desde 2018 publicando una turra cada sábado, y este archivo existe porque alguien tenía que ordenarlas. Divulga la resolución de problemas complejos en España y la aplica a empresas desde Singular Solving. Es ingeniero informático y presidió Mensa España.",
    author: "Recuenco",
  },
  {
    name: "Carlos Hernández Gómez",
    handle: "k4rliky",
    photo: "/people/carlos-hernandez.jpg",
    role: "Hizo la web y la mantiene",
    bio: "De pequeño se pasaba los videojuegos buscando las zonas secretas, y sigue igual con todo lo que no conoce. Aprendió resolución de problemas complejos en el curso de la UNIR, con Recuenco de profesor, y de ahí salió la idea de tener las turras en un sitio donde se pudieran releer.",
  },
  {
    name: "Víctor R. Escobar",
    handle: "nudpiedo",
    photo: "/people/victor-escobar.jpg",
    role: "Mantiene la web y firma algunas turras",
    bio: "«Trabajo con problemas que empeoran cuando intentas arreglarlos», dice de sí mismo. Fundó Quixotic Strategy Lab para hacer estrategia en entornos de complejidad, y los sábados que firma la turra habla del metajuego, del fraude publicitario o del CTO como estratega. Ingeniero informático, y habla varios idiomas.",
    author: "nudpiedo",
    site: { label: "Quixotic Strategy Lab", url: "https://quixoticstrategylab.com" },
  },
  {
    name: "Ángel",
    handle: "4jr4m0s",
    photo: "/people/angel.jpg",
    role: "Mantiene la web",
    bio: "Ha sido venture manager, estratega, product manager, coach y arquitecto cloud, y se define como un «Do'er». Ingeniero y agilista. Es fácil encontrárselo en el #CPSLive, y cuando no, corriendo, con un cubo de Rubik o estudiando japonés.",
  },
  {
    name: "Toni Dorta",
    handle: "ToniDorta",
    photo: "/people/toni-dorta.jpg",
    role: "Hace el CPS Notebook",
    bio: "Creó el CPS Notebook, el cuaderno de la comunidad que acompaña a este archivo. Antes dirigió proyectos y equipos, con un MBA y la certificación PMP de por medio, y trabajó como consultor de innovación.",
  },
  {
    name: "Alejandra Arri",
    handle: "ladycircus",
    photo: "/people/alejandra-arri.jpg",
    role: "Colabora con la web",
    bio: "Desarrolladora frontend desde hace más de una década, de las que no dan una interfaz por terminada hasta que está exacta al píxel. Le importan el diseño y la experiencia de quien usa lo que construye, y cada problema lo ve como una ocasión de aprender. Fuera del trabajo: moda, decoración, cupcakes recién hechos y comedias románticas.",
    site: { label: "alejandraarri.com", url: "https://www.alejandraarri.com" },
  },
];

const link = "underline decoration-whiskey-300 underline-offset-4 hover:text-brand hover:decoration-brand";
const heading = "mt-14 border-b-2 border-whiskey-900 pb-2 font-serif text-2xl font-bold text-whiskey-950";

export default function SobreEstaWeb() {
  const stats = getSiteStats();
  const firstYear = stats.firstPublishedAt?.slice(0, 4) ?? "";
  const authors = listAuthors().filter((author) => author.handle !== SITE.featuredAuthor);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-serif text-4xl font-bold text-whiskey-950 sm:text-5xl">Sobre esta web</h1>
      <div className="mt-5 space-y-4 text-lg leading-relaxed text-whiskey-900">
        <p>
          Recuenco publica una turra cada sábado desde {firstYear}. Son hilos largos en X sobre resolución de problemas
          complejos, y en X se pierden: el timeline no está pensado para releer. Aquí están las {stats.threads}, ordenadas por
          tema y por año, con buscador, un{" "}
          <Link href="/glosario" className={link}>
            glosario de {listGlossary().length} conceptos
          </Link>
          , los{" "}
          <Link href="/biblioteca" className={link}>
            {listBooks().length} libros que citan
          </Link>{" "}
          y una{" "}
          <Link href="/ebook" className={link}>
            edición en EPUB
          </Link>{" "}
          para leerlas sin conexión.
        </p>
        <p>
          La mantiene un grupo pequeño de la Comunidad CPS, gente que aprendió con las turras y quería tenerlas a mano. Si llegas
          nuevo, no empieces por la última: empieza por{" "}
          <Link href="/empieza-aqui" className={link}>
            estas ocho
          </Link>
          .
        </p>
      </div>

      <h2 className={heading}>Quién está detrás</h2>
      <ul className="divide-y divide-whiskey-200">
        {PEOPLE.map((person) => (
          <li key={person.handle} className="flex gap-5 py-6">
            <Image
              src={person.photo}
              alt={person.name}
              width={80}
              height={80}
              className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
            />
            <div>
              <p className="font-semibold text-whiskey-950">
                {person.name}{" "}
                <a href={authorUrl(person.handle)} target="_blank" rel="noopener noreferrer" className={`font-normal text-whiskey-800 ${link}`}>
                  @{person.handle}
                </a>
              </p>
              <p className="text-sm text-whiskey-800">{person.role}</p>
              <p className="mt-2 leading-relaxed text-whiskey-900">{person.bio}</p>
              {(person.author || person.site) && (
                <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-whiskey-900">
                  {person.author && (
                    <Link href={`/autor/${person.author}`} className={link}>
                      Sus turras
                    </Link>
                  )}
                  {person.site && (
                    <a href={person.site.url} target="_blank" rel="noopener noreferrer" className={link}>
                      {person.site.label}
                    </a>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <h2 className={heading}>Otras firmas</h2>
      <p className="mt-4 leading-relaxed text-whiskey-900">
        Algunos sábados la turra la firma otra persona:{" "}
        {authors.map((author, index) => (
          <span key={author.handle}>
            <Link href={`/autor/${author.handle}`} className={link}>
              {author.name}
            </Link>
            {index < authors.length - 2 ? ", " : index === authors.length - 2 ? " y " : ""}
          </span>
        ))}
        .
      </p>

      <h2 className={heading}>Cómo ayudar</h2>
      <p className="mt-4 leading-relaxed text-whiskey-900">
        ¿Falta una turra, has visto un error o echas en falta un concepto del glosario?{" "}
        <a href={`${SITE.repository}/issues/new`} target="_blank" rel="noopener noreferrer" className={link}>
          Cuéntalo en GitHub
        </a>
        . Y si una turra te ha servido, pásasela a alguien a quien también le pueda servir.
      </p>

      <h2 className={heading}>Imágenes</h2>
      <ul className="mt-4 space-y-2 leading-relaxed text-whiskey-900">
        {IMAGE_CREDITS.map((credit) => (
          <li key={credit.url}>
            {credit.where}:{" "}
            <a href={credit.url} target="_blank" rel="noopener noreferrer" className={link}>
              {credit.title}
            </a>
            , de {credit.author}, vía {credit.source}.
          </li>
        ))}
      </ul>
    </main>
  );
}
