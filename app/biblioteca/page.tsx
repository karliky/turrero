import type { Metadata } from 'next';
import BookGrid from './components/BookGrid';
import { listBooks } from '@/lib/queries';
import { BOOK_CATEGORIES, SITE } from '@/lib/site';

const description = `Colección de libros mencionados en las turras de ${SITE.byline}`;

export const metadata: Metadata = {
  title: 'Biblioteca',
  description,
  openGraph: {
    title: `Biblioteca - ${SITE.name}`,
    description,
    images: ['/promo.png'],
  },
};

export default function LibrosPage() {
  const books = listBooks();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-whiskey-900 mb-4">La biblioteca.</h1>
        <p className="text-lg text-whiskey-700 mb-6">Un total de {books.length} libros mencionados en las turras.</p>
      </div>

      <BookGrid books={books} categories={BOOK_CATEGORIES} />
    </main>
  );
}
