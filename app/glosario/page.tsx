import type { Metadata } from 'next';
import { listGlossary } from '@/lib/queries';
import { SITE } from '@/lib/site';

const description = `Glosario de términos especializados utilizados en las turras de ${SITE.byline}`;

export const metadata: Metadata = {
  title: 'Glosario CPS',
  description,
  openGraph: {
    title: `Glosario CPS - ${SITE.name}`,
    description,
    images: ['/promo.png'],
  },
};

export default function GlosarioPage() {
  const terms = listGlossary();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-whiskey-800 mb-4">Glosario CPS</h1>

      <p className="text-gray-600 mb-8">
        Aqui hay un glosario de la jerga especializada que se utiliza en las turras de {SITE.byline}.
        Recoger y explicar estos términos es una tarea en curso, a la cual puedes contribuir{" "}
        <a href={`${SITE.repository}/issues/new?title=Glosario:%20`} className="text-brand underline">
          proponiendo un término en GitHub
        </a>
        .
      </p>

      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full table-auto">
          <thead className="bg-whiskey-800 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider w-48">Término</th>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Definición</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.map((term) => (
              <tr key={term.term} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 text-sm font-medium text-whiskey-800 w-48">{term.term}</td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-wrap">{term.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
