'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { SEARCH_MARK_END, SEARCH_MARK_START, type SearchResult } from '@/lib/types';

const DEBOUNCE_MS = 300;
// Same minimum as the server: shorter terms are ignored
const MIN_QUERY_LENGTH = 2;

/** Renders a search snippet, highlighting the marked matches. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${SEARCH_MARK_START}[^${SEARCH_MARK_END}]*${SEARCH_MARK_END})`));
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith(SEARCH_MARK_START) ? (
          <mark key={index} className="bg-transparent text-brand">
            {part.slice(1, -1)}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  /** Only a magnifier button that opens the search dialog (mobile header). */
  compact?: boolean;
}

export default function SearchBar({ className = '', placeholder, compact = false }: SearchBarProps) {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const search = async (query: string): Promise<void> => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      if (!compact) setIsModalOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { results: SearchResult[] };
      setResults(data.results);
      setIsModalOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setInputText(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(value), DEBOUNCE_MS);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const modalContent = document.querySelector('.modal-content');
      if (isModalOpen && modalContent && !modalContent.contains(e.target as Node)) {
        setIsModalOpen(false);
      }
    };
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen) modalInputRef.current?.focus();
  }, [isModalOpen]);

  return (
    <div className={`relative ${className}`}>
      {compact ? (
        <button
          type="button"
          aria-label="Buscar turras"
          className="p-1 text-whiskey-700 hover:text-whiskey-900 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
        >
          <FaSearch className="w-5 h-5" />
        </button>
      ) : (
        <div className="relative group">
          <input
            type="text"
            value={inputText}
            onChange={onChange}
            placeholder={placeholder ?? 'Buscar turras...'}
            className="w-full pl-10 pr-4 py-2.5 border border-whiskey-200 rounded-lg bg-surface placeholder:text-whiskey-700 text-whiskey-950 transition-colors focus:outline-hidden focus:border-whiskey-300 focus:ring-1 focus:ring-whiskey-200 hover:border-whiskey-200/80"
          />
          <FaSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLoading ? 'text-whiskey-300' : 'text-whiskey-600'}`}
            onClick={isLoading ? undefined : () => void search(inputText)}
          />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out">
          <div className="modal-content bg-surface rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl transition-all duration-300 ease-in-out transform animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-4 border-b border-whiskey-200">
              <h2 className="text-lg font-semibold text-whiskey-900">Resultados de búsqueda</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar búsqueda"
                className="p-1 hover:bg-whiskey-100 rounded-full transition-colors"
              >
                <FaTimes className="text-whiskey-700" />
              </button>
            </div>

            <div className="p-4 border-b border-whiskey-200">
              <div className="relative">
                <input
                  ref={modalInputRef}
                  type="text"
                  value={inputText}
                  onChange={onChange}
                  placeholder="Buscar turras..."
                  className="w-full pl-3 pr-10 py-2 border border-whiskey-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-whiskey-300 text-whiskey-900 placeholder:text-whiskey-700"
                />
                <FaSearch
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-whiskey-600 cursor-pointer hover:text-whiskey-800"
                  onClick={() => void search(inputText)}
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-12rem)]">
              {results.map((result) => (
                <button
                  key={result.threadId}
                  type="button"
                  className="block w-full text-left p-4 hover:bg-whiskey-50 border-b border-whiskey-100 last:border-b-0"
                  onClick={() => {
                    setIsModalOpen(false);
                    router.push(`/turra/${result.threadId}#${result.tweetId}`);
                  }}
                >
                  <div className="text-base text-whiskey-900 mb-3 leading-relaxed font-bold">{result.title}</div>
                  <div className="text-sm text-whiskey-800 mb-2">
                    <Snippet text={result.snippet} />
                  </div>
                  <div className="text-xs text-whiskey-700">
                    Fecha de publicación: {new Intl.DateTimeFormat('es').format(new Date(result.publishedAt))}
                  </div>
                </button>
              ))}
              {results.length === 0 && (
                <div className="p-4 text-center text-whiskey-700">
                  {inputText.trim().length < MIN_QUERY_LENGTH ? 'Escribe al menos dos letras' : 'No se encontraron resultados'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
