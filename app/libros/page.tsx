import { TweetFacade, Book } from "../../infrastructure";
import BookGrid from './components/BookGrid';

const categories = [
  "Nonfiction", "Psychology", "History", "Business", "Self Help",
  "Personal Development", "Technology", "Science", "Biography",
  "Health", "Economics", "Education", "Artificial Intelligence",
  "Games", "Fiction"
];

const categoriesMap: { [key: string]: string } = {
  "Nonfiction": "No ficción",
  "Psychology": "Psicología",
  "History": "Historia",
  "Business": "Negocios y empresa",
  "Self Help": "Autoayuda",
  "Personal Development": "Desarrollo personal",
  "Technology": "Tecnología",
  "Science": "Ciencia",
  "Biography": "Biografía",
  "Health": "Salud",
  "Economics": "Economía",
  "Education": "Educación",
  "Artificial Intelligence": "Inteligencia artificial",
  "Games": "Juegos",
  "Fiction": "Ficción"
};

export default async function LibrosPage() {
  const tweetFacade = new TweetFacade();
  const books = tweetFacade.getBooks();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-whiskey-900 mb-4">
          Todos los libros mencionados en las turras
        </h1>
        <p className="text-lg text-whiskey-700 mb-6">
          Un total de {books.length} libros
        </p>
      </div>
      
      <BookGrid 
        books={books} 
        categories={categories} 
        categoriesMap={categoriesMap} 
      />
    </main>
  );
} 