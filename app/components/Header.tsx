"use client";

import { useState } from "react";
import Image from "next/image";
import SearchBar from '@/app/components/SearchBar';
import { FaCaretDown } from 'react-icons/fa';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center gap-x-1 text-xl font-semibold text-whiskey-800">
            <Image className="w-10 h-auto mr-2" src="/logo.png" alt="Logo" width={100} height={100}></Image>
            <Link href="/" className="text-whiskey-800">El <span className="text-brand">Turrero Post</span></Link>
          </span>
        </div>

        <button 
          className="lg:hidden text-whiskey-800 hover:text-whiskey-950"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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
          isMenuOpen ? 'absolute top-16 left-0 right-0 bg-white shadow-md' : 'hidden'
        } lg:relative lg:flex lg:top-0 lg:shadow-none lg:space-x-8 w-full lg:w-auto flex-col lg:flex-row items-center`}>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link href="/glosario" className="text-whiskey-800 hover:text-whiskey-950 block text-center">Glosario</Link>
          </li>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link href="/libros" className="text-whiskey-800 hover:text-whiskey-950 block text-center">Libros</Link>
          </li>
          <li className="w-full lg:w-auto py-2 px-4 lg:px-0">
            <Link href="/hall-of-fame" className="text-whiskey-800 hover:text-whiskey-950 block text-center">Hall of Fame</Link>
          </li>
          <li className="hidden lg:block w-full lg:w-auto py-2 px-4 lg:px-0 relative group">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-full text-whiskey-800 hover:text-whiskey-950 flex items-center justify-center lg:justify-start"
            >
              Aprende más
              <FaCaretDown className="ml-1" />
            </button>
            <ul className="hidden lg:group-hover:block w-48 bg-white shadow-lg rounded-md py-2 absolute -left-10 mt-2">
              <li>
                <Link href="/sobre-esta-web" className="block px-4 py-2 text-whiskey-800 hover:text-whiskey-950 hover:bg-gray-100 text-left">
                  Sobre esta web
                </Link>
              </li>
              <li>
                <Link href="#" className="block px-4 py-2 text-whiskey-800 hover:text-whiskey-950 hover:bg-gray-100 text-left">
                  Versión en PDF
                </Link>
              </li>
              <li>
                <Link href="#" className="block px-4 py-2 text-whiskey-800 hover:text-whiskey-950 hover:bg-gray-100 text-left">
                  Grafo de Turras
                </Link>
              </li>
              <li>
                <Link href="https://cps.tonidorta.com/" className="block px-4 py-2 text-whiskey-800 hover:text-whiskey-950 hover:bg-gray-100 text-left">
                  CPS Notebook
                </Link>
              </li>
            </ul>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link href="/sobre-esta-web" className="block text-whiskey-800 hover:text-whiskey-950 text-center">
              Sobre esta web
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link href="#" className="block text-whiskey-800 hover:text-whiskey-950 text-center">
              Versión en PDF
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link href="#" className="block text-whiskey-800 hover:text-whiskey-950 text-center">
              Grafo de Turras
            </Link>
          </li>
          <li className="lg:hidden w-full py-2 px-4">
            <Link href="https://cps.tonidorta.com/" className="block text-whiskey-800 hover:text-whiskey-950 text-center">
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