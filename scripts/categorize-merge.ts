// Usage: npx tsx scripts/categorize-merge.ts
// Merges the two independent classification passes (data/categorization/pass-a, pass-b) into assignments.json:
// - same primary in both passes → accepted; secondary = categories both passes marked as secondary
// - different primary → must be decided in resolutions.json ({id: {primary, secondary, reason}})
// Slugs listed in taxonomy.json "merged" are mapped to the category that absorbed them first.
// Writes assignments.json and disagreements.md (the audit trail); exits with 1 listing unresolved turras.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Pass {
  id: string;
  primary: string;
  secondary: string[];
  evidence: Record<string, string>;
  confidence: string;
}
interface Resolution {
  primary: string;
  secondary: string[];
  reason: string;
}

const dir = join(process.cwd(), 'data', 'categorization');
const readPass = (name: string) =>
  new Map(
    readdirSync(join(dir, name))
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => JSON.parse(readFileSync(join(dir, name, file), 'utf8')) as Pass[])
      .map((p) => [p.id, p]),
  );
// Categories merged after the passes because they fell below the minimum size (taxonomy.json "merged")
const merged = (JSON.parse(readFileSync(join(dir, 'taxonomy.json'), 'utf8')) as { merged?: Record<string, string> }).merged ?? {};
const readMerged = (name: string) =>
  new Map(
    [...readPass(name)].map(([id, p]) => {
      const primary = merged[p.primary] ?? p.primary;
      const secondary = [...new Set(p.secondary.map((slug) => merged[slug] ?? slug))].filter((slug) => slug !== primary);
      return [id, { ...p, primary, secondary }];
    }),
  );
const a = readMerged('pass-a');
const b = readMerged('pass-b');
let resolutions: Record<string, Resolution> = {};
try {
  resolutions = JSON.parse(readFileSync(join(dir, 'resolutions.json'), 'utf8')) as Record<string, Resolution>;
} catch {
  // No resolutions yet
}

const ids = [...a.keys()];
if (ids.length !== b.size || ids.some((id) => !b.has(id))) throw new Error('pass-a and pass-b cover different turras');

const assignments: { id: string; primary: string; secondary: string[] }[] = [];
const report: string[] = [];
const unresolved: string[] = [];
let agreed = 0;

for (const id of ids) {
  const pa = a.get(id)!;
  const pb = b.get(id)!;
  const resolution = resolutions[id];
  if (resolution) {
    assignments.push({ id, primary: resolution.primary, secondary: resolution.secondary });
    report.push(
      `## ${id}\n- Pasada A: ${pa.primary} (${pa.secondary.join(', ') || '—'}) · confianza ${pa.confidence}\n` +
        `- Pasada B: ${pb.primary} (${pb.secondary.join(', ') || '—'}) · confianza ${pb.confidence}\n` +
        `- **Decisión: ${resolution.primary}** (${resolution.secondary.join(', ') || '—'}). ${resolution.reason}\n`,
    );
    if (pa.primary === pb.primary) agreed++;
  } else if (pa.primary === pb.primary) {
    agreed++;
    assignments.push({ id, primary: pa.primary, secondary: pa.secondary.filter((slug) => pb.secondary.includes(slug)) });
  } else {
    unresolved.push(`${id}: A=${pa.primary} B=${pb.primary}`);
  }
}

const rate = ((agreed / ids.length) * 100).toFixed(1);
console.log(`${ids.length} turras, primary agreed in ${agreed} (${rate} %), resolved ${Object.keys(resolutions).length}`);
if (unresolved.length > 0) {
  console.error(`Unresolved (${unresolved.length}):\n${unresolved.join('\n')}`);
  process.exit(1);
}

writeFileSync(join(dir, 'assignments.json'), `${JSON.stringify(assignments, null, 2)}\n`);
writeFileSync(
  join(dir, 'disagreements.md'),
  `# Desacuerdos entre las dos pasadas\n\nAcuerdo en la categoría principal: ${agreed} de ${ids.length} turras (${rate} %).\n` +
    `Estas son las turras decididas a mano, leyendo el texto completo, con el motivo de cada decisión.\n\n${report.join('\n')}`,
);
console.log('→ data/categorization/assignments.json, disagreements.md');
