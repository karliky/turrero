import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { FaBookOpen, FaDownload } from 'react-icons/fa';
import { SITE } from '@/lib/site';

interface EbookInfo {
  file: string;
  bytes: number;
  threads: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  generatedAt: string;
}

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: `Ebook - ${SITE.name}`,
  description: `Todas las turras de ${SITE.byline} en un ebook (EPUB) para leer en Kindle, Kobo, Apple Books o Google Play Libros.`,
};

/** Written by `npm run ebook`, which runs before `next build`. */
function readInfo(): EbookInfo | null {
  const file = join(process.cwd(), 'public', 'ebook', 'info.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as EbookInfo) : null;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

const READERS = [
  { name: 'Kindle', how: 'Envíalo con "Send to Kindle" (web, app o email): Amazon acepta EPUB y lo convierte para tu Kindle.' },
  { name: 'Kobo y otros e-readers', how: 'Conecta el lector por USB y copia el fichero en su memoria.' },
  { name: 'Apple Books', how: 'Ábrelo desde el iPhone, iPad o Mac y se añadirá a tu biblioteca.' },
  { name: 'Google Play Libros', how: 'Súbelo desde play.google.com/books (Subir archivos).' },
];

export default function EbookPage() {
  const info = readInfo();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-surface rounded-xl shadow-md p-8">
        <FaBookOpen className="text-4xl text-whiskey-600 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-whiskey-900 text-center mb-4">Todas las turras en un ebook</h1>

        {info ? (
          <>
            <p className="text-whiskey-800 text-center mb-6">
              Las <strong>{info.threads} turras</strong>
              {info.firstPublishedAt && info.lastPublishedAt && (
                <>
                  {' '}publicadas entre el {formatDate(info.firstPublishedAt)} y el {formatDate(info.lastPublishedAt)}
                </>
              )}
              , ordenadas por fecha, con índice por año, imágenes optimizadas para e-readers y los enlaces citados en cada turra.
            </p>
            <div className="text-center mb-8">
              <a
                href={info.file}
                download
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-whiskey-800 text-whiskey-50 font-medium hover:bg-whiskey-900 transition-colors"
              >
                <FaDownload aria-hidden="true" />
                Descargar EPUB ({(info.bytes / 1024 / 1024).toFixed(0)} MB)
              </a>
              <p className="text-xs text-whiskey-700 mt-3">Edición del {formatDate(info.generatedAt)}. Se actualiza con cada turra nueva.</p>
            </div>
          </>
        ) : (
          <p className="text-center text-whiskey-700 mb-8">El ebook todavía no se ha generado (npm run ebook).</p>
        )}

        <h2 className="text-lg font-semibold text-whiskey-900 mb-3">Cómo leerlo</h2>
        <ul className="space-y-3 text-sm text-whiskey-800">
          {READERS.map((reader) => (
            <li key={reader.name}>
              <strong>{reader.name}:</strong> {reader.how}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
