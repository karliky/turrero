// Usage: npx tsx scripts/glossary-evidence.ts
// Read-only: for every glossary candidate (current terms plus concepts found in the turras), finds the
// turras and tweets that use it and writes .cache/glossary/evidence.json for the glossary writers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../lib/db';
import { listGlossary } from '../lib/queries';

/** New candidates: concepts the turras use that the glossary lacks, with their search variants. */
const NEW_CANDIDATES: Record<string, string[]> = {
  CPS: ['cps', 'complex problem solving', 'resolucion de problemas complejos'],
  'CPS hispano': ['cps hispano'],
  'Cultura luterana': ['luterano', 'luterana', 'postluteran'],
  'Orquestación cognitiva': ['orquestacion cognitiva', 'orquestador cognitivo', 'orquestacion'],
  Zeitgeist: ['zeitgeist'],
  'Propuesta de valor caducada': ['propuesta de valor caducada', 'propuesta de valor caduca', 'propuestas de valor caducadas'],
  Zelotes: ['zelote'],
  'Sweet spot': ['sweet spot'],
  'Procesos de alta variabilidad (PAV)': ['alta variabilidad', 'pav'],
  'Hotel de Hilbert': ['hotel de hilbert'],
  Bothism: ['bothism'],
  'Abrochador liminal': ['abrochador liminal', 'abrochamiento liminal', 'abrochador'],
  Pantomima: ['pantomima'],
  Moat: ['moat'],
  Centauro: ['centauro'],
  'Espiral del «pa qué»': ['pa que', 'pa quien'],
  'Truth coping': ['truth coping'],
  'Niebla de Silent Hill': ['silent hill'],
  'Teorema de Roca Salvatella': ['roca salvatella'],
  'IA chasm': ['ia chasm', 'ai chasm'],
  'Test Astudillo': ['test astudillo'],
  'Facciones lanares': ['lanar'],
  'Game awareness': ['game awareness'],
  'Fatiga de materiales': ['fatiga de materiales'],
  Autosegmentación: ['autosegmentacion', 'autosegment'],
  Zugzwang: ['zugzwang'],
  'Elefante negro': ['elefante negro'],
  'Síndrome del Coronel Thompson': ['coronel thompson'],
  'Soluciones de mierda': ['soluciones de mierda', 'solucion de mierda'],
  'Transición obligada': ['transicion obligada'],
  'Juegos infinitos': ['juego infinito', 'juegos infinitos'],
  'Espiral del silencio': ['espiral del silencio'],
  'Emulsificador de equipo': ['emulsificador', 'emulsionador'],
  'Equipo Apolo': ['apolo'],
  Chutzpah: ['chutzpah'],
  'Recoger cable': ['recoger cable'],
  'Rabbit hole': ['rabbit hole'],
  'Efecto Gell-Mann': ['gell-mann', 'gell mann'],
  'Blue ocean': ['oceano azul', 'oceanos azules', 'blue ocean'],
  'Private equity': ['private equity'],
  'Dr. House': ['dr. house', 'doctor house', 'dr house'],
  'Cul de sac': ['cul de sac'],
  Hijoputismo: ['hijoputismo'],
  Chavesnogalismo: ['chavesnogal'],
  'Zona de desarrollo próximo': ['zona de desarrollo proximo', 'zona de confianza proxima'],
  'Tokens de confianza': ['tokens de confianza', 'token de confianza'],
  'Madriguera de conejo': ['madriguera'],
  'Solvers Academy': ['solvers academy'],
  'Singular Solving': ['singular solving'],
  'Altas capacidades (AACC)': ['altas capacidades', 'aacc'],
  Neurodivergencia: ['neurodivergen'],
  'Men out of time': ['men out of time', 'man out of time'],
};

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Search variants of a current glossary term: without "(Cynefin)"-style notes and without accents. */
function variantsOf(term: string): string[] {
  const base = fold(term.replace(/\(.*?\)/g, '')).trim();
  const inner = /\((.*?)\)/.exec(term)?.[1];
  return [...new Set([base, inner && inner.length > 3 ? fold(inner) : null].filter((v): v is string => !!v))];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const db = openDb(undefined, { readOnly: true });
const tweets = (
  db
    .prepare('SELECT w.id, w.thread_id, w.text, t.title FROM tweets w JOIN threads t ON t.id = w.thread_id')
    .all() as { id: string; thread_id: string; text: string; title: string }[]
).map((tweet) => ({ ...tweet, folded: fold(tweet.text) }));

const candidates = [
  ...listGlossary(db).map((entry) => ({ term: entry.term, current: entry, variants: variantsOf(entry.term) })),
  ...Object.entries(NEW_CANDIDATES).map(([term, variants]) => ({ term, current: null, variants })),
];

const evidence = candidates.map(({ term, current, variants }) => {
  // Whole-word match; short acronyms (PAV, CPS, AACC) must keep their case in the original text
  const patterns = variants.map((v) =>
    v.length <= 4 ? new RegExp(`\\b${escape(v.toUpperCase())}\\b`) : new RegExp(`(^|[^a-z])${escape(v)}`),
  );
  const hits = tweets.filter((tweet) =>
    patterns.some((pattern, i) => pattern.test(variants[i]!.length <= 4 ? tweet.text.normalize('NFD').replace(/[̀-ͯ]/g, '') : tweet.folded)),
  );
  const byThread = new Map<string, typeof hits>();
  for (const hit of hits) byThread.set(hit.thread_id, [...(byThread.get(hit.thread_id) ?? []), hit]);
  const threads = [...byThread.entries()].sort((a, b) => b[1].length - a[1].length);
  return {
    term,
    current: current ? { definition: current.body, reference: current.origin } : null,
    variants,
    turras: threads.length,
    mentions: hits.length,
    top: threads.slice(0, 5).map(([threadId, list]) => ({
      threadId,
      title: list[0]!.title,
      mentions: list.length,
      tweets: list.slice(0, 3).map((tweet) => ({ tweetId: tweet.id, text: tweet.text.slice(0, 600) })),
    })),
  };
});
db.close();

const dir = join(process.cwd(), '.cache', 'glossary');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'evidence.json'), JSON.stringify(evidence, null, 1));
console.log(`${evidence.length} candidates → ${join(dir, 'evidence.json')}`);
console.log(
  evidence
    .map((e) => `${String(e.turras).padStart(3)} turras  ${e.current ? ' ' : '+'} ${e.term}`)
    .sort()
    .reverse()
    .join('\n'),
);
