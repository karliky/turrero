import { OG_SIZE, renderShareCard } from '@/lib/og';
import { listCitations, listConceptMap } from '@/lib/queries';
import { SITE } from '@/lib/site';

export const alt = `Mapa de ideas - ${SITE.name}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const concepts = listConceptMap().concepts.length;
  const citations = listCitations().length;
  return renderShareCard({
    label: 'Mapa de ideas',
    title: 'Cómo evolucionan las ideas de las turras',
    byline: SITE.byline,
    highlight: `${concepts} conceptos, ${citations} citas entre turras`,
  });
}
