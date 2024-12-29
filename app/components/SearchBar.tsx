'use client';

import { useState, useRef, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import algoliasearch from 'algoliasearch';

const client = algoliasearch('WU4KEG8DAS', '7bd2f67692c4d35a0c9a5d7e005deb1e');
const index = client.initIndex('turras');

interface SearchBarProps {
  className?: string;
}

interface SearchResult {
  id: string;
  time: string;
  objectID: string;
  summary?: string;
  _highlightResult: {
    tweet: {
      value: string;
      matchLevel: string;
      fullyHighlighted: boolean;
      matchedWords: string[];
    };
  };
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const [inputText, setInputText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const DEBOUNCE_MIN_MS = 300;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSearch = async (searchValue: string) => {
    if (searchValue === '') {
      setIsLoading(false);
      setIsModalOpen(false);
      return setSearchResults([]);
    }

    try {
      setIsLoading(true);
      const { hits } = await index.search<SearchResult>(searchValue);
      
      const summaryPromises = hits.map(async (hit) => {
        const tweetId = hit.id.split('-')[0];
        const response = await fetch(`/api/search?q=${tweetId}`);
        const data = await response.json();
        return {
          ...hit,
          summary: data.summary
        };
      });
      
      const resultsWithSummary = await Promise.all(summaryPromises);
      setSearchResults(resultsWithSummary);
      setIsLoading(false);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setIsLoading(false);
    }
  };

  const onSearchDebounce = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value.toLowerCase();
    setInputText(searchValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(searchValue), DEBOUNCE_MIN_MS);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const modalContent = document.querySelector('.modal-content');
      if (isModalOpen && modalContent && !modalContent.contains(e.target as Node)) {
        setIsModalOpen(false);
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [isModalOpen]);

  const triggerSearch = () => {
    onSearch(inputText);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={onSearchDebounce}
          placeholder="Buscar turras..."
          className="w-full pl-3 pr-10 py-2 border border-whiskey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-whiskey-300 text-whiskey-900 placeholder-whiskey-500"
        />
        {!isLoading && (
          <FaSearch 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-whiskey-500 cursor-pointer hover:text-whiskey-700" 
            onClick={triggerSearch}
          />
        )}
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 
          transition-opacity duration-300 ease-in-out"
        >
          <div 
            className="modal-content bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl
            transition-all duration-300 ease-in-out transform
            animate-in fade-in slide-in-from-bottom-4"
          >
            <div className="flex justify-between items-center p-4 border-b border-whiskey-200">
              <h2 className="text-lg font-semibold text-whiskey-900">Resultados de búsqueda</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-whiskey-100 rounded-full transition-colors"
              >
                <FaTimes className="text-whiskey-500" />
              </button>
            </div>
            
            <div className="p-4 border-b border-whiskey-200">
              <div className="relative">
                <input
                  ref={modalInputRef}
                  type="text"
                  value={inputText}
                  onChange={onSearchDebounce}
                  placeholder="Buscar..."
                  className="w-full pl-3 pr-10 py-2 border border-whiskey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-whiskey-300 text-whiskey-900 placeholder-whiskey-500"
                />
                <FaSearch 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-whiskey-500 cursor-pointer hover:text-whiskey-700" 
                  onClick={triggerSearch}
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(80vh-12rem)] scrollbar-thin scrollbar-thumb-whiskey-300 scrollbar-track-whiskey-100">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-4 hover:bg-whiskey-50 cursor-pointer border-b border-whiskey-100 last:border-b-0"
                  onClick={() => {
                    window.location.href = `/turra/${result.id.split('-')[0]}#${result.id.split('-')[1]}`;
                  }}
                >
                  {result.summary && (
                    <div className="text-base text-whiskey-900 mb-3 leading-relaxed font-bold">
                      {result.summary}
                    </div>
                  )}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result._highlightResult.tweet.value,
                    }}
                    className="text-sm text-whiskey-800 mb-2 [&>em]:text-red-500 [&>em]:not-italic"
                  />
                  <div className="text-xs text-whiskey-500">
                    Fecha de publicación:{' '}
                    {new Intl.DateTimeFormat('es').format(new Date(result.time))}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && (
                <div className="p-4 text-center text-whiskey-500">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 