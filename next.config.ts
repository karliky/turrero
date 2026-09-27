import type { NextConfig } from "next";

// Category URLs used to contain accents; the canonical slugs are ASCII.
const ACCENTED_CATEGORY_URLS: Record<string, string> = {
  "resolución-de-problemas-complejos": "/resolucion-de-problemas-complejos",
  "sociología": "/sociologia",
  "gestión-del-talento": "/gestion-del-talento",
  "orquestación-cognitiva": "/orquestacion-cognitiva",
  "lectura-de-señales": "/lectura-de-senales",
  "las-más-nuevas": "/",
  "top-25-turras": "/",
  "otros-autores": "/",
};

const nextConfig: NextConfig = {
  // Images are served as-is (local /metadata files and pbs.twimg.com)
  images: { unoptimized: true },
  // Route handlers that read the database at request time need the file in their bundle
  outputFileTracingIncludes: {
    "/api/search": ["./data/turrero.db"],
    "/turra/[id]": ["./data/turrero.db"],
  },
  async redirects() {
    return Object.entries(ACCENTED_CATEGORY_URLS).flatMap(([accented, destination]) =>
      [...new Set([`/${accented}`, `/${encodeURIComponent(accented)}`])].map((source) => ({
        source,
        destination,
        permanent: true,
      })),
    );
  },
};

export default nextConfig;
