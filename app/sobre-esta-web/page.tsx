import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteStats, listAuthors, listBooks, listGlossary } from "@/lib/queries";
import { SITE, authorUrl } from "@/lib/site";

const description = `Qué es ${SITE.name} y quién está detrás: el archivo de las turras de Javier G. Recuenco y la Comunidad CPS.`;

export const metadata: Metadata = {
  title: `Sobre esta web | ${SITE.name}`,
  description,
  openGraph: { title: `Sobre esta web - ${SITE.name}`, description, images: ["/opengraph-image"] },
};

interface Person {
  name: string;
  handle: string;
  photo: string;
  role: string;
  bio: string;
  /** Author page in the archive, for people who have written turras. */
  author?: string;
}

// Bios written from what each person says about themselves; same register for everyone
const PEOPLE: Person[] = [
  {
    name: "Javier G. Recuenco",
    handle: "Recuenco",
    photo: "/people/recuenco.jpg",
    role: "Escribe las turras",
    bio: "Ingeniero informático. Divulga la resolución de problemas complejos en España y la aplica a empresas desde Singular Solving. Ha presidido Mensa España. Publica una turra cada sábado desde 2018.",
    author: "Recuenco",
  },
  {
    name: "Carlos Hernández Gómez",
    handle: "k4rliky",
    photo: "https://avatars.githubusercontent.com/u/881069?v=4",
    role: "Hace la web",
    bio: "Creció entrando en las zonas secretas de los videojuegos y conserva esa curiosidad por lo que hay fuera de su mundo. Se formó en resolución de problemas complejos en el curso de la UNIR, con Recuenco como profesor.",
  },
  {
    name: "Toni Dorta",
    handle: "ToniDorta",
    photo: "/people/toni-dorta.jpg",
    role: "CPS Notebook",
    bio: "Ingeniero informático, con certificación PMP y un MBA. Ha dirigido proyectos y equipos y ha trabajado como consultor de innovación. Creó el CPS Notebook, el cuaderno de la comunidad que complementa este archivo.",
  },
  {
    name: "Víctor R. Escobar",
    handle: "nudpiedo",
    photo: "/people/victor-escobar.jpg",
    role: "Turras invitadas",
    bio: "Escribe las turras de los sábados en que Recuenco le cede la cuenta: sobre el metajuego, el fraude publicitario o el CTO como estratega. Habla seis idiomas.",
    author: "nudpiedo",
  },
  {
    name: "Alejandra Arri",
    handle: "ladycircus",
    photo: "/people/alejandra-arri.jpg",
    role: "Colabora",
    bio: "Desarrolladora full stack. Le interesa el punto donde se cruzan el análisis y el diseño, y trabaja sobre todo en la parte visible de las aplicaciones.",
  },
  {
    name: "Ángel",
    handle: "4jr4m0s",
    photo: "/people/angel.jpg",
    role: "Colabora",
    bio: "Venture manager y arquitecto cloud. Ha trabajado en estrategia, producto y equipos ágiles. Corre, resuelve cubos de Rubik y estudia japonés.",
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
          {SITE.name} archiva las turras de Javier G. Recuenco: los hilos largos que publica en X cada sábado desde {firstYear}{" "}
          sobre resolución de problemas complejos. Están las {stats.threads}, ordenadas por tema y por año, con un buscador, un{" "}
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
          Lo hace la Comunidad CPS, gente que aprendió con las turras y quería tenerlas a mano, sin depender del timeline de X. Si
          llegas nuevo, empieza por{" "}
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
              {person.author && (
                <Link href={`/autor/${person.author}`} className={`mt-2 inline-block text-sm font-medium text-whiskey-900 ${link}`}>
                  Sus turras
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <h2 className={heading}>Otras firmas</h2>
      <p className="mt-4 leading-relaxed text-whiskey-900">
        Algunos sábados la turra la escribe otra persona. Estas son las firmas invitadas del archivo:{" "}
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
    </main>
  );
}
