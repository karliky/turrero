"use client";
import { useState } from "react";
import { LazyImage } from "@/app/components/LazyImage";
import Link from "next/link";
import type { Book } from "@/lib/types";
import { tweetUrl } from "@/lib/site";

// Font sizes in cqw (percent of the cover width), largest first
const TITLE_SIZES = [18, 16, 14, 12, 11, 10, 9, 8, 7];
const CHAR_WIDTH = 0.55; // average glyph width of bold serif, in em
const LINE_HEIGHT = 1.15;
const TEXT_WIDTH = 82; // cqw left after padding and the red spine
const TITLE_HEIGHT = 105; // cqw of the 150cqw-tall cover kept for the title

/** Largest size at which the longest word fits on one line and the whole title fits in the cover. */
function titleSize(title: string): number {
  const longestWord = Math.max(...title.split(/\s+/).map((word) => word.length));
  const fits = (size: number) => {
    const charsPerLine = Math.floor(TEXT_WIDTH / (size * CHAR_WIDTH));
    const lines = Math.ceil(title.length / charsPerLine) + 1; // +1 for ragged line breaks
    return longestWord <= charsPerLine && lines * size * LINE_HEIGHT <= TITLE_HEIGHT;
  };
  return TITLE_SIZES.find(fits) ?? TITLE_SIZES.at(-1)!;
}

/** Stand-in cover when there is no image or it fails to load. Text scales with the cover. */
function TypographicCover({ title, author }: { title: string; author: string | null }) {
  const [main = title, subtitle] = title.split(/:\s+/, 2);
  return (
    <div className="@container absolute inset-0 bg-whiskey-100 border-l-4 border-brand">
      <div className="flex h-full flex-col justify-between p-[7cqw]">
        <p
          className="font-serif font-bold text-whiskey-950 break-words"
          style={{ fontSize: `${titleSize(main)}cqw`, lineHeight: LINE_HEIGHT }}
        >
          {main}
        </p>
        {/* Like a real cover: the author at the foot, or the subtitle when the author is unknown */}
        {author ? (
          <p className="text-[6.5cqw] font-semibold uppercase tracking-wide leading-snug text-whiskey-800 line-clamp-2">{author}</p>
        ) : (
          subtitle && <p className="text-[6.5cqw] leading-snug text-whiskey-800 line-clamp-3">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function Cover({ book }: { book: Book }) {
  const [failed, setFailed] = useState(false);
  if (!book.imageUrl || failed) return <TypographicCover title={book.title} author={book.author} />;
  return (
    <LazyImage
      src={book.imageUrl}
      alt={book.title}
      fill
      placeholderClassName="absolute inset-0 bg-whiskey-100"
      onError={() => setFailed(true)}
      className="object-contain transition-all duration-200 group-hover:scale-105 grayscale group-hover:grayscale-0"
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
    />
  );
}

interface BookGridProps {
  books: Book[];
  categories: readonly string[];
}

export default function BookGrid({ books, categories }: BookGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredBooks = selectedCategory
    ? books.filter((book) => book.categories.includes(selectedCategory))
    : books;

  return (
    <>
      {/* Categories Filter - Updated with modern pill design */}
      <div className="mb-8 flex flex-wrap gap-2 px-1">
        <button
          className={`px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium shadow-xs ${
            selectedCategory === null
              ? 'bg-whiskey-700 text-whiskey-50 shadow-whiskey-200'
              : 'bg-surface text-whiskey-800 hover:bg-whiskey-50 border border-whiskey-200'
          }`}
          onClick={() => setSelectedCategory(null)}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium shadow-xs ${
              selectedCategory === category
                ? 'bg-whiskey-700 text-whiskey-50 shadow-whiskey-200'
                : 'bg-surface text-whiskey-800 hover:bg-whiskey-50 border border-whiskey-200'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Books Grid - Enhanced with hover effects and better spacing */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-1">
        {filteredBooks.map((book) => (
          <div key={book.url} className="group flex flex-col bg-surface rounded-xl p-3 transition-all duration-200 hover:shadow-md">
            <a 
              href={book.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="relative block"
            >
              <div className="relative aspect-[2/3] mb-2 rounded-lg overflow-hidden">
                <Cover book={book} />
              </div>
              <h3 className="font-medium text-sm text-whiskey-950 line-clamp-2 group-hover:text-whiskey-700 transition-colors">
                {book.title}
              </h3>
              {book.author && <p className="mt-0.5 text-xs text-whiskey-700 line-clamp-1">{book.author}</p>}
            </a>
            
            {book.mentions[0] && (
              <div className="mt-2 flex gap-3 text-xs">
                <a
                  href={tweetUrl(book.mentions[0].authorHandle, book.mentions[0].tweetId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-whiskey-800 hover:text-whiskey-800 transition-colors flex items-center gap-1"
                >
                  Tweet original
                </a>
                <Link
                  href={`/turra/${book.mentions[0].threadId}#${book.mentions[0].tweetId}`}
                  className="text-whiskey-800 hover:text-whiskey-800 transition-colors flex items-center gap-1"
                >
                  Turra original
                </Link>
              </div>
            )}

            {/* Categories - More compact and modern */}
            <div className="mt-2 flex flex-wrap gap-1">
              {book.categories.map((category) => (
                <span
                  key={category}
                  className="text-[10px] px-2 py-0.5 bg-whiskey-50 text-whiskey-800 rounded-full border border-whiskey-100"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 