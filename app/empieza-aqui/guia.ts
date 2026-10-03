// Editorial selection for /empieza-aqui: a reading path, the series worth reading in order and the ideas
// with a name of their own. Quotes are literal (tests check them against the tweets); titles come from the database.

export interface GuideStep {
  id: string;
  /** Tweet of the turra where the quote comes from. */
  tweetId: string;
  /** Literal words of Recuenco that sum up the turra. */
  quote: string;
}

export interface GuideSeries {
  slug: string;
  name: string;
  /** Still being written. */
  ongoing?: boolean;
  /** In reading order. */
  parts: { id: string; label: string }[];
}

export interface GuidePillar {
  /** Glossary entry of the pillar. */
  slug: string;
  name: string;
  tweetId: string;
  /** Literal words of Recuenco that define the pillar. */
  quote: string;
}

/** The four macrodisciplines of CPS, as Recuenco draws them in his December 2020 turra. */
export const pillars: { threadId: string; intro: GuideStep; attractors: GuideStep; items: GuidePillar[] } = {
  threadId: "1340160478316785666",
  intro: {
    id: "1340160478316785666",
    tweetId: "1340175001555709952",
    quote: "no existe como disciplina en el vacío, sino que es el resultado de la superposición de cuatro macrodisciplinas",
  },
  attractors: {
    id: "1340160478316785666",
    tweetId: "1340176152967655424",
    quote: "Todas ellas afectadas por los cinco atractores",
  },
  items: [
    {
      slug: "ciencias-de-la-complejidad",
      name: "Ciencias de la complejidad",
      tweetId: "1340176659291508736",
      quote: "Sistemas no lineales, Systems Thinking, Emergencia, Sensemaking",
    },
    {
      slug: "ecosistemas-tecnologicos",
      name: "Ecosistemas tecnológicos",
      tweetId: "1340178060348407810",
      quote: "Un mapeo y un entendimiento profundo de todo lo que el megaatractor de megatendencias tecnológicas puede hacer",
    },
    {
      slug: "factor-x",
      name: "Factor X",
      tweetId: "1340179497879003136",
      quote: "Todo lo relativo al factor humano: Psicología, Antropología, Sociología, Etnografía",
    },
    {
      slug: "business-acumen",
      name: "Business acumen",
      tweetId: "1340180316611350529",
      quote: "Todo lo relativo a contextos empresariales y/o comerciales: Estrategia, Propuesta de Valor, Lectura de Señales",
    },
  ],
};

export interface AttractorChange {
  /** Names in the original version, with a turra where they are discussed; empty for a new attractor. */
  before: string[];
  beforeSource: GuideStep | null;
  after: string;
  /** Tweet of the 2026 turra that explains the change, and its literal words. */
  tweetId: string;
  quote: string;
}

/** The five attractors: the original version (2016) and the 2026 one, from the December 2025 turra. */
export const attractors: { threadId: string; intro: GuideStep; changes: AttractorChange[] } = {
  threadId: "2004624575837958361",
  intro: {
    id: "2004624575837958361",
    tweetId: "2004624577247240206",
    quote: "su vigencia era, como la de tantas otras cosas, contextual",
  },
  changes: [
    {
      before: ["Megatendencias tecnológicas"],
      beforeSource: {
        id: "1355414699400175616",
        tweetId: "1355448493066903553",
        quote: "uno de los cinco megaatractores que están transformando todo",
      },
      after: "Megatendencias tecnológicas",
      tweetId: "2004624604032127011",
      quote: "No creo que entremos en una era de desaceleración del cambio tecnológico por el momento",
    },
    {
      before: ["Crunching business models"],
      beforeSource: {
        id: "1401066568034009088",
        tweetId: "1401066618910916616",
        quote: "Cada vez menos cortesía del atractor crunching business time",
      },
      after: "Warp speed",
      tweetId: "2004624604942205259",
      quote: "con todo acelerándose de manera acorde e incluyendo el auge de la gestión de la incertidumbre como parte del paisaje",
    },
    {
      before: ["Espacios hiperpersonales", "Customer centricity y personotecnia"],
      beforeSource: {
        id: "1454341690022670339",
        tweetId: "1454341740043833350",
        quote: "los dos atractores más desconocidos",
      },
      after: "Relevance First",
      tweetId: "2004624605839851973",
      quote: "Implicaciones de primer nivel en modelos de negocio Tech y en la industria publicitaria",
    },
    {
      before: ["Agenda 2030: ODS, ethical challengers, consumidor coherente"],
      beforeSource: {
        id: "1373170914226008064",
        tweetId: "1373171087266226176",
        quote: "Cuando el zeitgeist golpea una industria, ésta desaparece",
      },
      after: "Colapso de los acuerdos post WW2",
      tweetId: "2004624606758351207",
      quote: "Dejamos de creer colectivamente en unas cosas y nos planteamos que no nos sirven ya cosas estructurales que han durado casi un siglo",
    },
    {
      before: [],
      beforeSource: null,
      after: "Reshuffling de la jerarquía intelectual",
      tweetId: "2004624612227719198",
      quote: "con grandes implicaciones laborales y educativas",
    },
  ],
};

export const guide: { path: GuideStep[]; series: GuideSeries[]; ideas: { slug: string; label: string }[] } = {
  // Chosen with the archive's own signal: the turras Recuenco cites most in later turras (see /mapa-de-ideas)
  path: [
    {
      id: "1302148427791253507",
      tweetId: "1302169702014296065",
      quote: "Un problema complejo es aquel sobre el que la mayor parte de los grandes expertos sobre la materia se declaran incompetentes, o no saben resolverlo."
    },
    {
      id: "1741006814873821551",
      tweetId: "1741006888081223697",
      quote: "El CPS es un cienciarte. No es una skill, no es un framework, es una serie de elementos base que se combinan de manera específica para un propósito determinado."
    },
    {
      id: "1297462657503694848",
      tweetId: "1297485455047495681",
      quote: "Mi problema histórico con el Design Thinking es que algunos practitioners no han entendido que solo tiene sentido en un entorno de liminalidad y cuando viene acompañado de otra serie de disciplinas."
    },
    {
      id: "1522830977088819203",
      tweetId: "1522830983036383233",
      quote: "La estrategia es Problem Solving. SI NO RESUELVE EL PROBLEMA NO ES ESTRATEGIA. ES MALA ESTRATEGIA."
    },
    {
      id: "1604019306349592577",
      tweetId: "1604019314234990592",
      quote: "El Factor X se diferencia del factor humano en que no acepta como absolutamente caótico el comportamiento humano e intenta en la medida de lo posible modelar el comportamiento esperado y gestionarlo."
    },
    {
      id: "1307211330349420545",
      tweetId: "1307218236031856640",
      quote: "El gran secreto del CPS y en general de la aproximación a los problemas complejos es que son irresolubles sin la participación orquestada cognitivamente de un equipo de talentos extremos diversos."
    },
    {
      id: "1494930305811111938",
      tweetId: "1494930414791708674",
      quote: "El Private Equity, los M&As... se creyeron inmunes al mal que afecta a todas las compañías: La obsolescencia de su propia propuesta de valor."
    },
    {
      id: "1335136099258294273",
      tweetId: "1335171491600756736",
      quote: "Hay multitud de variantes, pero todas se reducen a un único tema: La racionalización del hecho de no querer asumir las consecuencias reales de implementar la estrategia debida."
    }
  ],
  series: [
    {
      slug: "libros-cpser",
      name: "Libros para ser CPSer",
      parts: [
        {
          id: "1327534186140487680",
          label: "Advertencias y primeros libros"
        },
        {
          id: "1330075571116777474",
          label: "Libros según las fases de la anticipación"
        },
        {
          id: "1340160478316785666",
          label: "Cuatro macrodisciplinas para elegir libros"
        }
      ]
    },
    {
      slug: "que-es-el-cps",
      name: "Qué es (y qué no es) el CPS",
      parts: [
        {
          id: "1766352097409134910",
          label: "El CPS como roguelike de construcción de mazos"
        },
        {
          id: "1768900222581624896",
          label: "Caso real: nace Unconventional CPS"
        },
        {
          id: "1771432938288107757",
          label: "La estrategia de formación en CPS"
        }
      ]
    },
    {
      slug: "sensemaking",
      name: "Sensemaking",
      parts: [
        {
          id: "1796796569829687349",
          label: "Pánico al sensemaking y colapso cognitivo"
        },
        {
          id: "1799313887285669975",
          label: "Rabbit holes y pensamiento liminal"
        },
        {
          id: "1801852274232218084",
          label: "Por qué nadie cambia de opinión"
        },
        {
          id: "1804386948938699148",
          label: "No se discute sobre sensemaking"
        },
        {
          id: "1806938762129101276",
          label: "Neuroestética: el sensemaking siempre hibridado"
        }
      ]
    },
    {
      slug: "incentivos",
      name: "Arquitecturas de incentivos",
      parts: [
        {
          id: "1649673649866113024",
          label: "Por qué fallan los planes de incentivos"
        },
        {
          id: "1654727164086960130",
          label: "Incentivos y dinámica corporativa"
        },
        {
          id: "1662345754642378753",
          label: "Modificación de conducta en proyectos CPS"
        }
      ]
    },
    {
      slug: "pompismo",
      name: "Pompismo",
      parts: [
        {
          id: "1748598237563412826",
          label: "Tesis: el idealismo que niega la realidad"
        },
        {
          id: "1751154901659381958",
          label: "Antítesis: fatiga de materiales y game awareness"
        },
        {
          id: "1753677668996837620",
          label: "El idealista con misión que llega al poder"
        },
        {
          id: "1758760266068590698",
          label: "El cómic como vehículo del pompismo"
        },
        {
          id: "1761287914493796842",
          label: "Cuándo la pasión pasa a destruir"
        }
      ]
    },
    {
      slug: "sidestepping",
      name: "Sidestepping",
      parts: [
        {
          id: "1893203295725871217",
          label: "Tekken 3, océanos azules y Calvinball"
        },
        {
          id: "1903343437719670927",
          label: "Cómo la Wii esquivó la guerra de potencia"
        },
        {
          id: "1908407119902024001",
          label: "Esquivar: sensórica y reajuste de pesos"
        }
      ]
    },
    {
      slug: "decadencia-empresarial",
      name: "Decadencia empresarial",
      parts: [
        {
          id: "1918555369426522309",
          label: "Nostalgia y pasado glorioso: Ventiladores Clyde"
        },
        {
          id: "1923622497406140517",
          label: "¿Cambiar la guardia o los mismos líderes?"
        },
        {
          id: "1926142175105995150",
          label: "Sectores obsoletos y reconversiones fallidas"
        },
        {
          id: "1928694865052741791",
          label: "Truth coping ante verdades incómodas"
        },
        {
          id: "1933784125086769389",
          label: "Cuando la profecía falla, la fe crece"
        },
        {
          id: "1936303239193878741",
          label: "Tercera generación y percepción del riesgo"
        }
      ]
    },
    {
      slug: "post-private-equity",
      name: "Post Private Equity",
      parts: [
        {
          id: "1989585041949622370",
          label: "Ciclos financieros: bonos basura, LBOs, quants"
        },
        {
          id: "1992135396793200730",
          label: "El PE, actor secundario que se vino arriba"
        },
        {
          id: "1994665880878186846",
          label: "El PE español ante el colapso"
        },
        {
          id: "1997212613571117548",
          label: "EA y los negocios de Factor X"
        },
        {
          id: "1999746151839338739",
          label: "CFU: equipos CPS para reflotar empresas"
        },
        {
          id: "2002288705726304422",
          label: "Cierre: ¿y ahora qué hacemos?"
        }
      ]
    },
    {
      slug: "cps-ia",
      name: "CPS e IA (2023)",
      parts: [
        {
          id: "1720721564465823881",
          label: "La IA como exoesqueleto del CPS"
        },
        {
          id: "1723236412487553316",
          label: "La IA contra la consultoría de juniors"
        },
        {
          id: "1725782327131885653",
          label: "El moat humano y la ventaja latina"
        },
        {
          id: "1728306256585101618",
          label: "Raíces asimétricas: lo que ChatGPT no ve"
        }
      ]
    },
    {
      slug: "ia-chasm",
      name: "IA Chasm",
      parts: [
        {
          id: "2075812328566562908",
          label: "El IA Chasm y los dos relojes"
        },
        {
          id: "2078375621047042415",
          label: "Project Everest: el fracaso de EY"
        },
        {
          id: "2080919569976185336",
          label: "Adoptar IA: un desierto de Sierra"
        }
      ]
    },
    {
      slug: "educacion",
      name: "Educación y neurodivergencia",
      parts: [
        {
          id: "2050469219544752257",
          label: "Preludio: ¿Xavier o Magneto?"
        },
        {
          id: "2053002707628142991",
          label: "Sistema taylorista y formación off-road"
        },
        {
          id: "2055523188407193998",
          label: "Escuelas de negocio y MBA obsoletos"
        },
        {
          id: "2058075392544539127",
          label: "IA, títulos y la guía finlandesa"
        },
        {
          id: "2060639447427727568",
          label: "La universidad ante la IA"
        },
        {
          id: "2063143047357931689",
          label: "De infantil a secundaria: filtro o puente"
        },
        {
          id: "2065676893144134027",
          label: "Entrada en el Colegio Balder"
        },
        {
          id: "2068230765683360029",
          label: "Historia y proyecto del Colegio Balder"
        },
        {
          id: "2070755210973077957",
          label: "Aprender en la tercera edad"
        },
        {
          id: "2073294311634973165",
          label: "La historia de Elena"
        }
      ]
    },
    {
      slug: "personotecnia",
      name: "Personotecnia y atención",
      ongoing: true,
      parts: [
        {
          id: "2098670392902557988",
          label: "Crisis de la atención y relevancia"
        },
        {
          id: "2101155734700405039",
          label: "Falsa personalización e inmunidad generacional"
        },
        {
          id: "2103744346142966174",
          label: "@uriondo: vender con IA sin engañar"
        },
        {
          id: "2106277152895189177",
          label: "Capitalismo de vigilancia: los años perdidos de la personalización"
        }
      ]
    }
  ],
  ideas: [
    {
      slug: "hotel-de-hilbert",
      label: "el hotel de Hilbert"
    },
    {
      slug: "personotecnia",
      label: "la personotecnia"
    },
    {
      slug: "factor-x",
      label: "el Factor X"
    },
    {
      slug: "pompismo",
      label: "el pompismo"
    },
    {
      slug: "truth-coping",
      label: "el truth coping"
    },
    {
      slug: "cps-hispano",
      label: "el CPS hispano"
    },
    {
      slug: "cultura-luterana",
      label: "la cultura luterana"
    },
    {
      slug: "teorema-de-roca-salvatella",
      label: "el teorema de Roca Salvatella"
    },
    {
      slug: "abrochador-liminal",
      label: "el abrochador liminal"
    },
    {
      slug: "test-astudillo",
      label: "el test Astudillo"
    },
    {
      slug: "espiral-del-pa-que",
      label: "la espiral del «pa qué»"
    },
    {
      slug: "facciones-lanares",
      label: "las facciones lanares"
    },
    {
      slug: "soluciones-de-mierda",
      label: "las soluciones de mierda"
    }
  ]
};
