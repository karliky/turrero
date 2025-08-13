"use client";

import { useState } from "react";
import SearchBar from '@/app/components/SearchBar';
import { FaCaretDown } from 'react-icons/fa';
import Link from 'next/link';

// Navigation configuration to eliminate duplication
const NAVIGATION_LINKS = [
  { href: "/glosario", label: "Glosario" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
] as const;

const SUBMENU_LINKS = [
  { href: "/sobre-esta-web", label: "Sobre esta web", external: false },
  { href: "/version-en-pdf", label: "Versión en PDF", external: false },
  { href: "/grafo-de-turras", label: "Grafo de Turras", external: false },
  { href: "https://cps.tonidorta.com/", label: "CPS Notebook", external: true },
] as const;

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Helper component for navigation links
  const NavigationLink = ({ 
    href, 
    label, 
    onClick, 
    className = "", 
    external = false 
  }: {
    href: string;
    label: string;
    onClick?: () => void;
    className?: string;
    external?: boolean;
  }) => {
    const linkProps = {
      href,
      className: `text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 font-medium ${className}`,
      ...(onClick && { onClick }),
      ...(external && { target: "_blank" as const, rel: "noopener noreferrer" }),
    };

    return (
      <Link {...linkProps}>
        {label}
      </Link>
    );
  };

  // Helper component for mobile hamburger button
  const MobileMenuButton = () => (
    <button 
      className="lg:hidden text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200"
      onClick={toggleMobileMenu}
      aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isMobileMenuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );

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

        <MobileMenuButton />

        <ul className={`${
          isMobileMenuOpen 
            ? 'absolute top-16 left-0 right-0 bg-white shadow-lg border-t border-whiskey-100 z-50 lg:bg-transparent lg:shadow-none lg:border-none' 
            : 'hidden'
        } lg:relative lg:flex lg:top-0 lg:shadow-none lg:space-x-8 w-full lg:w-auto flex-col lg:flex-row items-center`}>
          
          {/* Main navigation links */}
          {NAVIGATION_LINKS.map(({ href, label }) => (
            <li key={href} className="w-full lg:w-auto py-2 px-4 lg:px-0">
              <NavigationLink
                href={href}
                label={label}
                onClick={closeMobileMenu}
                className="block text-center"
              />
            </li>
          ))}

          {/* Desktop submenu */}
          <li className="hidden lg:block w-full lg:w-auto py-2 px-4 lg:px-0 relative group">
            <button 
              className="w-full text-whiskey-700 hover:text-whiskey-900 transition-colors duration-200 flex items-center justify-center lg:justify-start font-medium"
            >
              Aprende más
              <FaCaretDown className="ml-1 group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <ul className="hidden lg:group-hover:block w-48 bg-white shadow-lg rounded-md py-2 absolute -left-10 mt-2 border border-whiskey-100 z-[60]">
              {SUBMENU_LINKS.map(({ href, label, external }) => (
                <li key={href}>
                  <NavigationLink
                    href={href}
                    label={label}
                    external={external}
                    className="block px-4 py-2 hover:bg-whiskey-50 text-left"
                  />
                </li>
              ))}
            </ul>
          </li>

          {/* Mobile submenu items */}
          {SUBMENU_LINKS.map(({ href, label, external }) => (
            <li key={`mobile-${href}`} className="lg:hidden w-full py-2 px-4">
              <NavigationLink
                href={href}
                label={label}
                external={external}
                onClick={closeMobileMenu}
                className="block text-center"
              />
            </li>
          ))}

          {/* Mobile search bar */}
          <li className="w-full lg:hidden py-2 px-4">
            <SearchBar className="w-full" />
          </li>
        </ul>

        <SearchBar className="hidden lg:block" />
      </nav>
    </header>
  );
} 