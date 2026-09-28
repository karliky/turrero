import type { Metadata } from 'next';
import { listGlossary } from '@/lib/queries';
import { SITE } from '@/lib/site';
import { GlossaryList } from './GlossaryList';
// Old anchors (merged or renamed terms) → current slug
import redirects from '../../data/glossary/redirects.json';

const description = `Glosario de los conceptos que usan las turras de ${SITE.byline}: qué significan, de dónde vienen y en qué turra se explican.`;

export const metadata: Metadata = {
  title: `Glosario CPS | ${SITE.name}`,
  description,
  openGraph: {
    title: `Glosario CPS - ${SITE.name}`,
    description,
    images: ['/opengraph-image'],
  },
};

export default function GlosarioPage() {
  const terms = listGlossary();

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-whiskey-950">Glosario CPS</h1>
        <p className="mt-3 text-lg leading-relaxed text-whiskey-900">
          Las turras tienen su propio vocabulario: conceptos prestados de la teoría de la complejidad, la psicología o la estrategia, y
          otros acuñados por Recuenco. Aquí están los {terms.length} que más se usan, explicados en llano y con la turra donde
          aparecen.
        </p>
        <p className="mt-2 text-sm text-whiskey-800">
          ¿Echas en falta alguno?{' '}
          <a href={`${SITE.repository}/issues/new?title=Glosario:%20`} className="text-brand underline">
            Propónlo en GitHub
          </a>
          .
        </p>
      </header>

      <GlossaryList terms={terms} redirects={redirects} />
    </main>
  );
}
