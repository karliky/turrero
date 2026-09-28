"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from "@/app/components/SearchBar";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { SITE } from "@/lib/site";

const NAVIGATION_LINKS = [
  { href: "/empieza-aqui", label: "Empieza aquí" },
  { href: "/turras", label: "Turras" },
  { href: "/glosario", label: "Glosario" },
  { href: "/biblioteca", label: "Biblioteca" },
] as const;

const MORE_LINKS = [
  { href: "/mapa-de-ideas", label: "Mapa de ideas", external: false },
  { href: "/sobre-esta-web", label: "Sobre esta web", external: false },
  { href: "/ebook", label: "Ebook", external: false },
  { href: SITE.community.notebook, label: "CPS Notebook", external: true },
] as const;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** "Más" menu: opens on click or keyboard (not only on hover) and closes on Escape or outside click. */
function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const active = MORE_LINKS.some((link) => isActive(pathname, link.href));
  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 py-2 font-medium transition-colors ${active ? "text-whiskey-950" : "text-whiskey-800 hover:text-whiskey-950"}`}
      >
        Más
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-whiskey-200 bg-surface py-1.5 shadow-lg">
          {MORE_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center justify-between px-4 py-2 text-whiskey-900 hover:bg-whiskey-50"
              >
                {link.label}
                {link.external && <span aria-hidden="true" className="text-whiskey-700">↗</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative border-b border-whiskey-200 bg-whiskey-50">
      {/* Three columns so the menu sits at the true centre whatever the width of the name and the search box */}
      <nav aria-label="Principal" className="container mx-auto grid h-16 grid-cols-[1fr_auto] items-center gap-6 px-4 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start whitespace-nowrap font-serif text-2xl font-bold tracking-tight text-whiskey-950">
          El <span className="text-brand">Turrero Post</span>
        </Link>

        <ul className="hidden items-center gap-6 lg:flex xl:gap-8">
          {NAVIGATION_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-2 font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 ${
                    active ? "text-whiskey-950 after:bg-brand" : "text-whiskey-800 hover:text-whiskey-950"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <MoreMenu pathname={pathname} />
        </ul>

        <div className="hidden w-full max-w-80 items-center gap-2 justify-self-end lg:flex">
          <div className="min-w-0 flex-1">
            <SearchBar />
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 justify-self-end lg:hidden">
          <SearchBar compact />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="-mr-1.5 p-1 text-whiskey-800 hover:text-whiskey-950"
          >
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-50 border-b border-whiskey-200 bg-whiskey-50 shadow-lg lg:hidden">
          <ul className="container mx-auto divide-y divide-whiskey-200 px-4">
            {NAVIGATION_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={`flex items-center justify-between py-4 font-serif text-xl font-bold ${
                    isActive(pathname, link.href) ? "text-brand" : "text-whiskey-950"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="container mx-auto flex flex-wrap gap-x-6 gap-y-2 px-4 pb-5 pt-2 text-sm font-medium">
            {MORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="text-whiskey-800 underline decoration-whiskey-300 underline-offset-4"
                >
                  {link.label}
                  {link.external && " ↗"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
