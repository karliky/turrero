import { describe, expect, test } from 'vitest';
import { excerpt, pageMetadata, stripTurraOpening, turraDescription } from '../lib/seo';
import { SITE } from '../lib/site';

describe('page metadata', () => {
  test('every page gets the full Open Graph and X cards, with the default image', () => {
    const meta = pageMetadata({ title: 'Glosario CPS', description: 'Conceptos.', path: '/glosario' });
    expect(meta.title).toBe(`Glosario CPS | ${SITE.name}`);
    expect(meta.alternates).toEqual({ canonical: '/glosario' });
    expect(meta.openGraph).toMatchObject({
      title: 'Glosario CPS',
      description: 'Conceptos.',
      url: '/glosario',
      siteName: SITE.name,
      locale: 'es_ES',
      type: 'website',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      site: SITE.xHandle,
      title: 'Glosario CPS',
      description: 'Conceptos.',
      images: [{ url: '/opengraph-image' }],
    });
  });

  test('turras are articles with date, author and section, and keep their own card', () => {
    const meta = pageMetadata({
      title: 'Una turra',
      description: 'Empieza así.',
      path: '/turra/1',
      ownImage: true,
      article: { publishedTime: '2024-01-06T09:00:00.000Z', author: 'Javier G. Recuenco', authorHandle: 'Recuenco', section: 'Estrategia' },
    });
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2024-01-06T09:00:00.000Z',
      authors: ['https://x.com/Recuenco'],
      section: 'Estrategia',
    });
    expect(meta.openGraph).not.toHaveProperty('images');
    expect(meta.twitter).toMatchObject({ creator: '@Recuenco' });
  });

  test('descriptions are cut at a word, without links', () => {
    expect(excerpt('Hoy hablo de algo https://t.co/abc   corto')).toBe('Hoy hablo de algo corto');
    const long = excerpt('palabra '.repeat(40), 30);
    expect(long.length).toBeLessThanOrEqual(31);
    expect(long.endsWith('palabra…')).toBe(true);
  });
});

describe('turra descriptions', () => {
  test('the ritual opening goes, the rest of the sentence stays', () => {
    expect(stripTurraOpening('En el hilo turras de hoy, vamos a hablar de rabbit holes y de pensamiento liminal inducido.')).toBe(
      'Rabbit holes y de pensamiento liminal inducido.',
    );
    expect(stripTurraOpening('En el hilo coñazo de hoy hablaremos de Rudy Fernández, de Kobe Bryant y de Van Halen.')).toBe(
      'Rudy Fernández, de Kobe Bryant y de Van Halen.',
    );
    expect(stripTurraOpening('En el hilo del sábado de hoy vamos a hablar de cuándo una compañía emite señales de caducidad.')).toBe(
      'Cuándo una compañía emite señales de caducidad.',
    );
    // Openings without the formula are left alone
    expect(stripTurraOpening('Abro hilo con mi opinión descarnada sobre este tema.')).toBe('Abro hilo con mi opinión descarnada sobre este tema.');
  });

  test('a turra that explains a glossary term opens with its definition', () => {
    const description = turraDescription({
      title: 'Exploración de los rabbit holes',
      opening: 'En el hilo turras de hoy, vamos a hablar de rabbit holes https://t.co/x',
      term: { term: 'Rabbit hole', short: 'Tema que parece sencillo y en el que acabas hundiéndote.' },
    });
    expect(description.startsWith('Rabbit hole: Tema que parece sencillo')).toBe(true);
    expect(description).not.toContain('https://');
  });

  test('a thin opening is led by the title', () => {
    expect(turraDescription({ title: 'La división en el marketing', opening: 'En el hilo turras de hoy, una pregunta que nos llega:', term: null })).toBe(
      'La división en el marketing. Una pregunta que nos llega:',
    );
  });
});
