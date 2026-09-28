import { OG_SIZE, renderShareCard } from '@/lib/og';
import { getSiteStats } from '@/lib/queries';
import { SITE } from '@/lib/site';

// Default card for every page without its own (home, glosario, biblioteca…)
export const alt = `${SITE.name} - Las turras de ${SITE.byline}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  const { threads } = getSiteStats();
  return renderShareCard({
    label: 'Archivo',
    title: `Las turras de ${SITE.byline}`,
    byline: 'Resolución de problemas complejos, estrategia y más',
    highlight: `${threads} turras`,
  });
}
