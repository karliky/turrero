import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getThread, listThreadIds } from '@/lib/queries';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} - Las turras de ${SITE.byline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return listThreadIds().map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const thread = getThread((await params).id);
  if (!thread) notFound();

  const date = format(new Date(thread.publishedAt), "d 'de' MMMM, yyyy", { locale: es });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: '#f9f6f3',
          borderLeft: '24px solid #a5050b',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#301e1a' }}>
          El&nbsp;<span style={{ color: '#a5050b' }}>Turrero Post</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: thread.title.length > 80 ? 56 : 68,
            fontWeight: 700,
            lineHeight: 1.15,
            color: '#5b3b33',
          }}
        >
          {thread.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#895645' }}>
          <span>{thread.author.name}</span>
          <span>{date}</span>
        </div>
      </div>
    ),
    size,
  );
}
