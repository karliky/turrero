// Editorial configuration of the site (not data about turras, which lives in the database).

export const SITE = {
  url: 'https://turrero.vercel.app',
  name: 'El Turrero Post',
  byline: 'Javier G. Recuenco y la Comunidad CPS',
  description:
    'Colección de turras de Javier G. Recuenco y la Comunidad CPS sobre resolución de problemas complejos, estrategia y más.',
  xHandle: '@recuenco',
  /** Author whose turras make up the bulk of the site; the others are listed as "Otros autores". */
  featuredAuthor: 'Recuenco',
  community: {
    name: 'Comunidad CPS',
    x: 'https://x.com/CPSComunidad',
    youtube: 'https://youtube.com/@cpsspain',
    notebook: 'https://cps.tonidorta.com/',
  },
  repository: 'https://github.com/karliky/turrero',
} as const;

/** Images by other authors used on the site (Unsplash and the like), credited in /sobre-esta-web. */
export const IMAGE_CREDITS: { where: string; title: string; author: string; source: string; url: string }[] = [
  {
    where: 'Fondo de la portada',
    title: 'Le bouvier, les levriers, la chevelure de Bérénice, carta celeste de 1795',
    author: 'The New York Public Library',
    source: 'Unsplash',
    url: 'https://unsplash.com/photos/4NeXilhxc3o',
  },
  {
    where: 'Fondo del pie de página',
    title: 'GM Island',
    author: 'Cameron Holt',
    source: 'ArtStation',
    url: 'https://cdnb.artstation.com/p/assets/images/images/079/964/729/large/cameron-holt-gm-island.jpg',
  },
  {
    where: 'Botón del ebook',
    title: 'Santa Fe Institute, entrada principal',
    author: 'Go2placitas (CC BY-SA 3.0)',
    source: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Santa_Fe_Institute.jpg',
  },
  {
    where: 'Botón del ebook',
    title: 'Atractor de Lorenz',
    author: 'Wikimol y Dschwen (CC BY-SA 3.0)',
    source: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/File:Lorenz_attractor_yb.svg',
  },
  {
    where: 'Botón del ebook',
    title: 'Diablo II: Resurrected, portada',
    author: 'Blizzard Entertainment',
    source: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/File:Diablo_2_Resurrected_cover_art.jpg',
  },
];

/**
 * Old URLs → current page (301): categories retired in the 2026 recategorization (data/categorization/)
 * and the accented slugs of the original site. Destinations are final, so there are no redirect chains.
 */
export const LEGACY_CATEGORY_URLS: Record<string, string> = {
  'resolucion-de-problemas-complejos': '/metodo-cps',
  'resolución-de-problemas-complejos': '/metodo-cps',
  'factor-x': '/psicologia-y-decisiones',
  'leyes-y-sesgos': '/psicologia-y-decisiones',
  'gestion-del-talento': '/equipos-y-liderazgo',
  'gestión-del-talento': '/equipos-y-liderazgo',
  'trabajo-en-equipo': '/equipos-y-liderazgo',
  'orquestacion-cognitiva': '/equipos-y-liderazgo',
  'orquestación-cognitiva': '/equipos-y-liderazgo',
  libros: '/biblioteca',
  'futurismo-de-frontera': '/ia-y-tecnologia',
  gaming: '/cultura-popular',
  'lectura-de-senales': '/sistemas-complejos',
  'lectura-de-señales': '/sistemas-complejos',
  'el-contexto-manda': '/sistemas-complejos',
  'desarrollo-de-habilidades': '/desarrollo-personal',
  'otras-turras-del-querer': '/reflexiones-personales',
  'sociología': '/sociologia',
  'las-más-nuevas': '/turras',
  'top-25-turras': '/turras?orden=interaccion',
  'otros-autores': '/turras?autor=todos',
};

/**
 * Book categories shown as filters in /biblioteca, most books first. Their criteria live in
 * data/categorization/books-taxonomy.json (tests/categorization.test.ts keeps both in sync).
 */
export const BOOK_CATEGORIES = [
  'Historia y biografías',
  'Estrategia y empresa',
  'Psicología y comportamiento',
  'Sociedad y política',
  'Desarrollo personal',
  'Tecnología e IA',
  'Economía y finanzas',
  'Ficción, cómic y juegos',
  'Filosofía y pensamiento',
  'Ciencia y complejidad',
  'Educación y aprendizaje',
] as const;

export function authorUrl(handle: string): string {
  return `https://x.com/${handle}`;
}

export function tweetUrl(handle: string, tweetId: string): string {
  return `https://x.com/${handle}/status/${tweetId}`;
}
