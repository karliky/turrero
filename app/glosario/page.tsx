import { TweetFacade, GlossaryTerm } from '@/infrastructure';
import { Metadata } from 'next';
import { AUTHORS } from '@/infrastructure/constants';

export const metadata: Metadata = {
  title: 'Glosario CPS',
  description: `Glosario de términos especializados utilizados en las turras de ${AUTHORS.MAIN}`,
  openGraph: {
    title: 'Glosario CPS - El Turrero Post',
    description: `Glosario de términos especializados utilizados en las turras de ${AUTHORS.MAIN}`,
    images: ['/promo.png'],
  }
};

export default async function GlosarioPage() {
  const facade = new TweetFacade();
  const terms = await facade.getGlossaryTerms();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-whiskey-800 mb-4">Glosario CPS</h1>
      
      <p className="text-gray-600 mb-8">
        Aqui hay un glosario de la jerga especializada que se utiliza en las turras de {AUTHORS.MAIN}. 
        Recoger y explicar estos términos es una tarea en curso, a la cual puedes contribuir editando este{" "}
        <a href="https://github.com/karliky/turrero/blob/main/infrastructure/db/glosario.csv" className="text-brand hover:text-brand-dark underline">fichero CSV en GitHub</a>, recuerda que lo puedes importar y editar en Excel.
      </p>

      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full table-auto">
          <thead className="bg-whiskey-800 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider w-48">
                Término
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                Definición
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.map((term: GlossaryTerm, index: number) => (
              <tr 
                key={index}
                className="hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="px-6 py-4 text-sm font-medium text-whiskey-800 w-48">
                  {term.term}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {term.definition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 