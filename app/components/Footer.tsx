import Link from 'next/link';
import { getSiteStats, listCategories } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { LazyImage } from './LazyImage';

const READ = [
  { href: '/empieza-aqui', label: 'Empieza aquí' },
  { href: '/turras', label: 'Todas las turras' },
  { href: '/glosario', label: 'Glosario' },
  { href: '/mapa-de-ideas', label: 'Mapa de ideas' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/ebook', label: 'Ebook' },
];

const COMMUNITY = [
  { href: SITE.community.x, label: 'X' },
  { href: SITE.community.youtube, label: 'YouTube' },
  { href: SITE.community.notebook, label: 'CPS Notebook' },
];

/** "26 de septiembre de 2026", in Madrid time. */
const longDate = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(iso));

const link = 'hover:text-brand transition-colors';
const heading = 'font-serif text-base font-bold text-whiskey-950';

const Footer = () => {
  const stats = getSiteStats();
  const categories = listCategories();

  return (
    <footer className="relative isolate mt-16 overflow-hidden border-t border-whiskey-200 bg-whiskey-100 text-sm text-whiskey-800">
      {/* The map is the background of the whole footer: visible at the top edge, a texture behind the text below */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* The island covers the whole footer, zoomed as needed, and the veil leaves it barely there */}
        <div className="footer-map-edges absolute inset-0">
          <LazyImage
            src="/images/footer-map.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_75%] blur-[1.5px] saturate-50"
            placeholderClassName="absolute inset-0"
          />
        </div>
        <div className="footer-veil absolute inset-0" />
      </div>

      <div className="container mx-auto grid gap-10 px-4 pb-12 pt-28 md:grid-cols-[1.3fr_1fr_2fr]">
        <div>
          <p className={heading}>{SITE.name}</p>
          <p className="mt-3 leading-relaxed">
            Las turras de Javier G. Recuenco y la Comunidad CPS, ordenadas por tema y por año para leerlas fuera del timeline de X.
          </p>
          {stats.lastPublishedAt && (
            <p className="mt-3 leading-relaxed">
              {stats.threads} turras. La última, del {longDate(stats.lastPublishedAt)}.
            </p>
          )}
          <p className="mt-3">
            Comunidad CPS:{' '}
            {COMMUNITY.map((item, index) => (
              <span key={item.href}>
                {index > 0 && ' · '}
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={`underline decoration-whiskey-300 underline-offset-4 ${link}`}>
                  {item.label}
                </a>
              </span>
            ))}
          </p>
        </div>

        <nav aria-labelledby="footer-read">
          <p id="footer-read" className={heading}>
            Leer
          </p>
          <ul className="mt-3 space-y-2">
            {READ.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-topics">
          <p id="footer-topics" className={heading}>
            Temas
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/${category.slug}`} className={link}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-whiskey-200">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-5 text-whiskey-700 sm:flex-row sm:items-center sm:justify-between">
          <p>Las turras son de sus autores. Un archivo sin ánimo de lucro, hecho por la Comunidad CPS.</p>
          <ul className="flex gap-5">
            <li>
              <Link href="/sobre-esta-web" className={link}>
                Sobre esta web
              </Link>
            </li>
            <li>
              <Link href="/contacto" className={link}>
                Contacto
              </Link>
            </li>
            <li>
              <a href={SITE.repository} target="_blank" rel="noopener noreferrer" className={link}>
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
