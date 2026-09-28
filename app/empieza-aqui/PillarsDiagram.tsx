import type { GuidePillar } from "./guia";

// Circles of Recuenco's diagram: one per pillar around the centre, overlapping, and the attractors in the middle
const CENTER = { x: 240, y: 210 };
const OFFSET = 95;
const RADIUS = 110;
const LAYOUT: Record<string, { dx: number; dy: number; label: { x: number; y: number; lines: string[] } }> = {
  "business-acumen": { dx: 0, dy: -1, label: { x: 240, y: 58, lines: ["Business acumen"] } },
  "ecosistemas-tecnologicos": { dx: 0, dy: 1, label: { x: 240, y: 352, lines: ["Ecosistemas", "tecnológicos"] } },
  "ciencias-de-la-complejidad": { dx: -1, dy: 0, label: { x: 104, y: 200, lines: ["Ciencias de la", "complejidad"] } },
  "factor-x": { dx: 1, dy: 0, label: { x: 382, y: 216, lines: ["Factor X"] } },
};

/** The four pillars as overlapping circles, like the Venn diagram of the turra, in the site's palette. */
export function PillarsDiagram({ pillars }: { pillars: GuidePillar[] }) {
  return (
    <svg
      viewBox="30 0 420 420"
      className="w-full"
      role="img"
      aria-label={`El CPS como superposición de cuatro disciplinas: ${pillars.map((pillar) => pillar.name).join(", ")}, con los cinco atractores en el centro`}
    >
      {pillars.map((pillar) => {
        const layout = LAYOUT[pillar.slug];
        if (!layout) return null;
        return (
          <circle
            key={pillar.slug}
            cx={CENTER.x + layout.dx * OFFSET}
            cy={CENTER.y + layout.dy * OFFSET}
            r={RADIUS}
            className="fill-whiskey-400/25 stroke-whiskey-500"
            strokeWidth="1.5"
          />
        );
      })}
      <a href="#atractores" className="group">
        <circle cx={CENTER.x} cy={CENTER.y} r="50" className="fill-whiskey-50 stroke-brand group-hover:fill-white" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={CENTER.x} y={CENTER.y - 4} textAnchor="middle" className="fill-brand font-serif text-[16px] font-bold">
          Cinco
        </text>
        <text x={CENTER.x} y={CENTER.y + 17} textAnchor="middle" className="fill-brand font-serif text-[16px] font-bold">
          atractores
        </text>
      </a>
      {pillars.map((pillar) => {
        const layout = LAYOUT[pillar.slug];
        if (!layout) return null;
        return (
          <a key={pillar.slug} href={`#pilar-${pillar.slug}`} className="group">
            <text x={layout.label.x} y={layout.label.y} textAnchor="middle" className="fill-whiskey-950 font-serif text-[20px] font-bold group-hover:fill-brand">
              {layout.label.lines.map((line, index) => (
                <tspan key={line} x={layout.label.x} dy={index === 0 ? 0 : 23}>
                  {line}
                </tspan>
              ))}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
