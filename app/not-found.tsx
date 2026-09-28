import type { Metadata } from "next";
import Link from "next/link";
import SearchBar from "./components/SearchBar";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Página no encontrada - ${SITE.name}`,
  alternates: { canonical: null },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-whiskey-900">Esta página no existe</h1>
      <p className="mt-4 text-whiskey-800">
        Puede que el enlace esté mal escrito o que la página se haya movido. Busca la turra por su contenido o
        repásalas todas en el archivo.
      </p>
      <SearchBar className="mx-auto mt-8 max-w-md text-left" />
      <div className="mt-8 flex justify-center gap-6 font-medium">
        <Link href="/" className="text-whiskey-700 hover:text-whiskey-900 underline decoration-whiskey-300">
          Ir al inicio
        </Link>
        <Link href="/turras" className="text-whiskey-700 hover:text-whiskey-900 underline decoration-whiskey-300">
          Todas las turras
        </Link>
      </div>
    </main>
  );
}
