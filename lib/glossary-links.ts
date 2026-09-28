// Finds glossary terms inside the text of a turra so they can be linked (first appearance only).
// Pure and shared by server and client code: no database or Node imports.

export interface LinkableTerm {
  slug: string;
  /** Names to look for: the term and its aliases. */
  names: string[];
}

export interface TermMatch {
  slug: string;
  start: number;
  end: number;
}

/**
 * Terms never linked, with all their aliases: they appear in almost every turra ("CPS", "hilo turras",
 * "Recuenco") or are everyday words ("contexto", "estrategia"), and linking them would bury the useful links.
 */
export const NOT_LINKED_SLUGS = new Set([
  'cps',
  'turra',
  'javier-g-recuenco',
  'contexto',
  'estrategia',
  'incertidumbre',
  'diagnostico',
  'consultoria',
  'sesgo-cognitivo',
]);

/** Single names that are also everyday words in Spanish ("estado de emergencia", "un plan complejo"). */
export const NOT_LINKED = new Set(['emergencia', 'incentivo', 'incentivos', 'sesgo', 'sesgos', 'complejo', 'complejidad', 'simple', 'complicado', 'caotico', 'disonancia', 'orquestacion', 'liminal']);

/**
 * Lowercase without accents, one output unit per UTF-16 code unit, so match indices map straight
 * back to the original text (emoji such as 🧵 are two code units and must not shift them).
 */
function fold(text: string): string {
  return text
    .split('')
    .map((ch) => ch.normalize('NFD').charAt(0).toLowerCase() || ch)
    .join('');
}

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

export interface Linker {
  /** Matches in one text, skipping slugs already linked earlier in the same turra. */
  find(text: string): TermMatch[];
}

/** One linker per turra: it remembers which terms were already linked so each is linked once. */
export function createLinker(terms: LinkableTerm[]): Linker {
  // Longest names first, so "CPS hispano" wins over "CPS" and overlaps resolve predictably
  const names = terms
    .filter((term) => !NOT_LINKED_SLUGS.has(term.slug))
    .flatMap((term) => term.names.map((name) => ({ slug: term.slug, name: fold(name.trim()) })))
    .filter(({ name }) => name.length >= 3 && !NOT_LINKED.has(name))
    .sort((a, b) => b.name.length - a.name.length);
  const linked = new Set<string>();

  return {
    find(text) {
      const folded = fold(text);
      const matches: TermMatch[] = [];
      for (const { slug, name } of names) {
        if (linked.has(slug)) continue;
        let index = folded.indexOf(name);
        while (index >= 0) {
          const end = index + name.length;
          const whole = !isWordChar(text[index - 1]) && !isWordChar(text[end]);
          const free = matches.every((m) => end <= m.start || index >= m.end);
          if (whole && free) {
            matches.push({ slug, start: index, end });
            linked.add(slug);
            break;
          }
          index = folded.indexOf(name, index + 1);
        }
      }
      return matches.sort((a, b) => a.start - b.start);
    },
  };
}
