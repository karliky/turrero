"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Book } from "@/lib/types";
import { tweetUrl } from "@/lib/site";

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
              ? 'bg-whiskey-600 text-white shadow-whiskey-200'
              : 'bg-white text-whiskey-800 hover:bg-whiskey-50 border border-whiskey-200'
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
                ? 'bg-whiskey-600 text-white shadow-whiskey-200'
                : 'bg-white text-whiskey-800 hover:bg-whiskey-50 border border-whiskey-200'
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
          <div key={book.url} className="group flex flex-col bg-white rounded-xl p-3 transition-all duration-200 hover:shadow-md">
            <a 
              href={book.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="relative block"
            >
              <div className="relative aspect-[2/3] mb-2 rounded-lg overflow-hidden">
                <Image
                  src={book.imageUrl ?? '/metadata/SJJzT3AT_11.jpeg'}
                  alt={book.title}
                  fill
                  className="object-contain transition-all duration-200 group-hover:scale-105 grayscale group-hover:grayscale-0"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              </div>
              <h3 className="font-medium text-sm text-gray-900 line-clamp-2 group-hover:text-whiskey-600 transition-colors">
                {book.title}
              </h3>
            </a>
            
            {book.mentions[0] && (
              <div className="mt-2 flex gap-3 text-xs">
                <a
                  href={tweetUrl(book.mentions[0].authorHandle, book.mentions[0].tweetId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-whiskey-600 transition-colors flex items-center gap-1"
                >
                  Tweet original
                </a>
                <Link
                  href={`/turra/${book.mentions[0].threadId}#${book.mentions[0].tweetId}`}
                  className="text-gray-600 hover:text-whiskey-600 transition-colors flex items-center gap-1"
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
                  className="text-[10px] px-2 py-0.5 bg-whiskey-50 text-whiskey-600 rounded-full border border-whiskey-100"
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