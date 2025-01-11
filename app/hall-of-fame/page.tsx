'use client';

import { Metadata } from 'next';

type Topic = {
  id: string;
  title: string;
  description: string;
  articles: Array<{
    id: string;
    title: string;
    url: string;
  }>;
};

const topics: Topic[] = [
  {
    id: 'pompismo',
    title: 'El pompismo',
    description: 'El "pompismo" describe a quienes crean su propia realidad, ignorando la complejidad del mundo. Es un juego de simplificación, donde la verdad a menudo queda fuera. ¿Vivimos todos, en cierta medida, dentro de nuestras propias burbujas?',
    articles: [
      {
        id: '1748598237563412826',
        title: 'Análisis crítico de los pompistas y el idealismo en la actualidad',
        url: '/turra/1748598237563412826',
      },
      {
        id: '1751154901659381958',
        title: 'El pompismo, segunda parte: Reflexión sobre la adaptación y anticipación en un mundo en constante cambio',
        url: '/turra/1751154901659381958',
      },
      {
        id: '1753677668996837620',
        title: 'Tercera y última parte del pompismo: El peligro del idealismo y la obsesión',
        url: '/turra/1753677668996837620',
      },
      {
        id: '1758760266068590698',
        title: 'Explorando el cómic como expresión del pompismo',
        url: '/turra/1758760266068590698',
      },
    ],
  },
  {
    id: 'arquitectura-incentivos',
    title: 'Arquitectura de incentivos',
    description: 'La "arquitectura de incentivos" es el arte de moldear comportamientos mediante recompensas y castigos. Un buen diseño nos guía hacia el éxito; un paso en falso y fracasamos.',
    articles: [
      {
        id: '1649673649866113024',
        title: 'Analizando la importancia de los incentivos en el ámbito empresarial y cómo influyen en el éxito o fracaso',
        url: '/turra/1649673649866113024',
      },
      {
        id: '1738462543344005507',
        title: 'Metaincentivos y decisiones en corporaciones (sobre cómo hablar al board)',
        url: '/turra/1738462543344005507',
      },
      {
        id: '1654727164086960130',
        title: 'Continúa la trilogía sobre incentivos: impacto en la dinámica corporativa',
        url: '/turra/1654727164086960130',
      },
      {
        id: '1662345754642378753',
        title: 'Revelada la tercera parte de la trilogía sobre arquitectura de incentivos y modificación de comportamiento',
        url: '/turra/1662345754642378753',
      },
      {
        id: '1398571638170529792',
        title: 'CPS real en grandes corporaciones cuando los incentivos están desalineados',
        url: '/turra/1398571638170529792',
      },
    ],
  },
  {
    id: 'inteligencia-artificial',
    title: 'Inteligencia artificial',
    description: 'La inteligencia artificial en el CPS se nos presenta como una herramienta transformadora, capaz de llevar el peso de lo rutinario para que podamos volar hacia la innovación. Es más que tecnología; es una invitación a repensar nuestros límites.',
    articles: [
      {
        id: '1720721564465823881',
        title: 'Analizando la fusión de Inteligencia Artificial y CPS en el mercado laboral',
        url: '/turra/1720721564465823881',
      },
      {
        id: '1626829061723983872',
        title: 'Creatividad e Inteligencia Artificial: ¿Será la IA la muerte de la creatividad humana?',
        url: '/turra/1626829061723983872',
      },
      {
        id: '1385833074001432576',
        title: 'La inteligencia se puede usar para tender puentes y no para agredir al diferente.',
        url: '/turra/1385833074001432576',
      },
      {
        id: '1728306256585101618',
        title: 'Finalizando la serie sobre IA y CPS: Reflexiones y Experiencias.',
        url: '/turra/1728306256585101618',
      },
    ],
  },
];

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <section 
      className="bg-white rounded-lg shadow-md p-6 transition-shadow hover:shadow-lg"
      aria-labelledby={`topic-${topic.id}`}
    >
      <h2 
        id={`topic-${topic.id}`}
        className="text-2xl font-semibold text-whiskey-800 mb-4 flex items-center gap-2"
      >
        <span className="text-brand text-xl">#</span>
        {topic.title}
      </h2>
      
      <p className="text-whiskey-700 mb-6 leading-relaxed">
        {topic.description}
      </p>

      <ul className="space-y-3" role="list">
        {topic.articles.map((article) => (
          <li key={article.id}>
            <a
              href={article.url}
              className="text-brand hover:text-whiskey-950 transition-colors block p-2 -ml-2 rounded-md hover:bg-whiskey-50"
            >
              {article.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HallOfFame() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-whiskey-900 mb-4">
          🏆 El salón de la fama 🏆
        </h1>
        <p className="text-xl text-whiskey-700">
          Las turras más influyentes y conceptos fundamentales que debes conocer.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: 'Salón de la Fama',
  description: 'Las turras más influyentes y conceptos fundamentales de Javier G. Recuenco',
  openGraph: {
    title: 'Salón de la Fama - El Turrero Post',
    description: 'Las turras más influyentes y conceptos fundamentales de Javier G. Recuenco',
  }
}; 