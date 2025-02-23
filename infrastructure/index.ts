import { TweetProvider } from "./TweetProvider";
import fs from 'fs';
import path from 'path';
import { parse } from '@fast-csv/parse';

export interface Tweet {
  id: string;
  content: string;
  categoryId: string;
  createdAt: Date;
}

export interface Book {
  id: string;
  type: 'card';
  img: string;
  url: string;
  media: string;
  turraId: string;
  title: string;
  categories: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  reference: string;
}

const Categories: string[] = [
    "top-25-turras",
    "las-más-nuevas",
    "resolución-de-problemas-complejos",
    "sistemas-complejos",
    "marketing",
    "estrategia",
    "factor-x",
    "sociología",
    "gestión-del-talento",
    "leyes-y-sesgos",
    "trabajo-en-equipo",
    "libros",
    "futurismo-de-frontera",
    "personotecnia",
    "orquestación-cognitiva",
    "gaming",
    "lectura-de-señales",
    "el-contexto-manda",
    "desarrollo-de-habilidades",
    "otras-turras-del-querer",
];

export class TweetFacade {
  public tweets: Tweet[] = [];
  public tweetProvider: TweetProvider;

  constructor() {
    this.tweetProvider = new TweetProvider();
  }

  getCategories(): string[] {
    return Categories;
  }

  getBooks(): Book[] {
    const books = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/books.json'), 'utf-8'));
    return books;
  }

  getBookCategories(): string[] {
    const books = this.getBooks();
    const categories = new Set<string>();
    books.forEach(book => book.categories.forEach(category => categories.add(category)));
    return Array.from(categories).sort();
  }

  async getGlossaryTerms(): Promise<GlossaryTerm[]> {
    const filePath = path.join(process.cwd(), 'infrastructure/db/glosario.csv');
    const results: GlossaryTerm[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({
          headers: ['term', 'definition', 'reference'],
          skipLines: 0,
          ignoreEmpty: true
        }))
        .on('data', (data: GlossaryTerm) => {
          if (data.term && data.definition) {
            results.push({
              term: data.term.trim(),
              definition: data.definition.trim(),
              reference: data.reference ? data.reference.trim() : ''
            });
          }
        })
        .on('error', (error) => reject(error))
        .on('end', () => resolve(results));
    });
  }
}
