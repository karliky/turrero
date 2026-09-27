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
  },
  repository: 'https://github.com/karliky/turrero',
} as const;

/** Book categories shown as filters in /biblioteca, in display order. */
export const BOOK_CATEGORIES = [
  'No ficción',
  'Psicología',
  'Historia',
  'Negocios y empresa',
  'Autoayuda',
  'Desarrollo personal',
  'Tecnología',
  'Ciencia',
  'Biografía',
  'Salud',
  'Economía',
  'Educación',
  'Inteligencia artificial',
  'Juegos',
  'Ficción',
] as const;

export function authorUrl(handle: string): string {
  return `https://x.com/${handle}`;
}

export function tweetUrl(handle: string, tweetId: string): string {
  return `https://x.com/${handle}/status/${tweetId}`;
}
