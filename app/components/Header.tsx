"use client";

import { useState } from "react";
import SearchBar from '@/app/components/SearchBar';
import { FaCaretDown } from 'react-icons/fa';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigationClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-whiskey-50 to-white border-b border-whiskey-100">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center gap-x-1 text-2xl font-bold text-whiskey-900 transition-colors duration-200">
            <Link href="/" className="hover:text-whiskey-700">
              El <span className="text-brand">Turrero Post</span>
            </Link>
          </span>
        </div>

        <button 
          className="lg:hidden text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <ul className={`${
          isMenuOpen 
            ? 'absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-whiskey-100 z-50' 
            : 'hidden'
        } lg:relative lg:flex lg:top-0 lg:shadow-none lg:space-x-8 w-full lg:w-auto flex-col lg:flex-row items-center`}>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link 
              href="/glosario" 
              onClick={handleNavigationClick} 
              className="text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 block text-center font-medium"
            >
              Glosario
            </Link>
          </li>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link 
              href="/biblioteca" 
              onClick={handleNavigationClick} 
              className="text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 block text-center font-medium"
            >
              Biblioteca
            </Link>
          </li>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link 
              href="/hall-of-fame" 
              onClick={handleNavigationClick} 
              className="text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 block text-center font-medium"
            >
              Hall of Fame
            </Link>
          </li>
          <li className="hidden lg:block w-full lg:w-auto py-2 px-4 lg:px-0 relative group">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-full text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 flex items-center justify-center lg:justify-start font-medium"
            >
              Aprende más
              <FaCaretDown className="ml-1 group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <ul className="hidden lg:group-hover:block w-48 bg-white shadow-lg rounded-md py-2 absolute -left-10 mt-2 border border-whiskey-100">
              <li>
                <Link 
                  href="/sobre-esta-web" 
                  className="block px-4 py-2 text-whiskey-700 hover:text-whiskey-900 hover:bg-whiskey-50 text-left transition-colors duration-200"
                >
                  Sobre esta web
                </Link>
              </li>
              <li>
                <Link 
                  href="/version-en-pdf" 
                  className="block px-4 py-2 text-whiskey-700 hover:text-whiskey-900 hover:bg-whiskey-50 text-left transition-colors duration-200"
                >
                  Versión en PDF
                </Link>
              </li>
              <li>
                <Link 
                  href="/grafo-de-turras" 
                  className="block px-4 py-2 text-whiskey-700 hover:text-whiskey-900 hover:bg-whiskey-50 text-left transition-colors duration-200"
                >
                  Grafo de Turras
                </Link>
              </li>
              <li>
                <Link href="https://cps.tonidorta.com/" target="_blank" className="block px-4 py-2 text-whiskey-700 hover:text-whiskey-900 hover:bg-whiskey-50 text-left transition-colors duration-200">
                  CPS Notebook
                </Link>
              </li>
            </ul>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link 
              href="/sobre-esta-web" 
              onClick={handleNavigationClick} 
              className="block text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 text-center font-medium"
            >
              Sobre esta web
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link 
              href="/version-en-pdf" 
              onClick={handleNavigationClick} 
              className="block text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 text-center font-medium"
            >
              Versión en PDF
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link 
              href="/grafo-de-turras" 
              onClick={handleNavigationClick} 
              className="block text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 text-center font-medium"
            >
              Grafo de Turras
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link href="https://cps.tonidorta.com/" target="_blank" onClick={handleNavigationClick} className="block text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 text-center font-medium">
              CPS Notebook
            </Link>
          </li>
          <li className="w-full lg:hidden py-2 px-4">
            <SearchBar className="w-full" />
          </li>
        </ul>

        <SearchBar className="hidden lg:block" />
      </nav>
    </header>
  );
} 