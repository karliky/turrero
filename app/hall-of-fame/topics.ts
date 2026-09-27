// Editorial selection of turras. IDs are checked against the database by tests/queries.test.ts.

export interface Topic {
  id: string;
  title: string;
  description: string;
  articles: { id: string; title: string }[];
}

export const topics: Topic[] = [
  {
    id: 'pompismo',
    title: 'El pompismo',
    description: 'El "pompismo" describe a quienes crean su propia realidad, ignorando la complejidad del mundo. Es un juego de simplificación, donde la verdad a menudo queda fuera. ¿Vivimos todos, en cierta medida, dentro de nuestras propias burbujas?',
    articles: [
      {
        id: '1748598237563412826',
        title: 'Análisis crítico de los pompistas y el idealismo en la actualidad',
      },
      {
        id: '1751154901659381958',
        title: 'El pompismo, segunda parte: Reflexión sobre la adaptación y anticipación en un mundo en constante cambio',
      },
      {
        id: '1753677668996837620',
        title: 'Tercera y última parte del pompismo: El peligro del idealismo y la obsesión',
      },
      {
        id: '1758760266068590698',
        title: 'Explorando el cómic como expresión del pompismo',
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
      },
      {
        id: '1738462543344005507',
        title: 'Metaincentivos y decisiones en corporaciones (sobre cómo hablar al board)',
      },
      {
        id: '1654727164086960130',
        title: 'Continúa la trilogía sobre incentivos: impacto en la dinámica corporativa',
      },
      {
        id: '1662345754642378753',
        title: 'Revelada la tercera parte de la trilogía sobre arquitectura de incentivos y modificación de comportamiento',
      },
      {
        id: '1398571638170529792',
        title: 'CPS real en grandes corporaciones cuando los incentivos están desalineados',
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
      },
      {
        id: '1626829061723983872',
        title: 'Creatividad e Inteligencia Artificial: ¿Será la IA la muerte de la creatividad humana?',
      },
      {
        id: '1385833074001432576',
        title: 'La inteligencia se puede usar para tender puentes y no para agredir al diferente.',
      },
      {
        id: '1728306256585101618',
        title: 'Finalizando la serie sobre IA y CPS: Reflexiones y Experiencias.',
      },
    ],
  },
];
