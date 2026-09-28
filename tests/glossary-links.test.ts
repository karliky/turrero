import { expect, test } from 'vitest';
import { createLinker } from '../lib/glossary-links';

const terms = [
  { slug: 'cps-hispano', names: ['CPS hispano'] },
  { slug: 'hotel-de-hilbert', names: ['hotel de Hilbert'] },
  { slug: 'pav', names: ['procesos de alta variabilidad', 'PAV'] },
  { slug: 'personotecnia', names: ['personotecnia'] },
  { slug: 'cps', names: ['CPS'] },
];
const slice = (text: string, linker = createLinker(terms)) => linker.find(text).map((m) => text.slice(m.start, m.end));

test('matches whole words, ignoring case and accents', () => {
  expect(slice('El Hotel de Hilbert explica por qué caduca todo')).toEqual(['Hotel de Hilbert']);
  expect(slice('La personotécnia bien hecha')).toEqual(['personotécnia']);
  expect(slice('Unos PAVOS reales')).toEqual([]);
});

test('prefers the longest name and never links the terms left out, whatever alias they appear with', () => {
  expect(slice('El CPS hispano frente al CPS luterano')).toEqual(['CPS hispano']);
  const linker = createLinker([...terms, { slug: 'turra', names: ['turra', 'hilo turras'] }]);
  expect(slice('En el hilo turras de hoy hablo de personotecnia', linker)).toEqual(['personotecnia']);
});

test('links each term only once per turra, across tweets', () => {
  const linker = createLinker(terms);
  expect(slice('Los procesos de alta variabilidad (PAV) no se gestionan con plantillas', linker)).toEqual([
    'procesos de alta variabilidad',
  ]);
  expect(slice('Otra vez PAV y hotel de Hilbert', linker)).toEqual(['hotel de Hilbert']);
});

test('returns matches in text order without overlaps', () => {
  const linker = createLinker(terms);
  const text = 'personotecnia y hotel de Hilbert';
  expect(linker.find(text).map((m) => m.slug)).toEqual(['personotecnia', 'hotel-de-hilbert']);
});

test('keeps positions right after emoji and accents', () => {
  const text = '🧵 Hilo sobre el hotel de Hilbert y la personotécnia';
  const linker = createLinker(terms);
  expect(linker.find(text).map((m) => text.slice(m.start, m.end))).toEqual(['hotel de Hilbert', 'personotécnia']);
});
