import type { NextConfig } from "next";

// Category URLs used to contain accents; the canonical slugs are ASCII.
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
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
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com", pathname: "/**" },
    ],
  },
  // Route handlers that read the database at request time need the file in their bundle
  outputFileTracingIncludes: {
    "/api/search": ["./data/turrero.db"],
    "/turra/[id]": ["./data/turrero.db"],
  },
  async redirects() {
    return Object.entries(LEGACY_CATEGORY_SLUGS).flatMap(([legacy, destination]) =>
      [...new Set([`/${legacy}`, `/${encodeURIComponent(legacy)}`])].map((source) => ({
        source,
        destination,
        permanent: true,
      })),
    );
  },
};

export default nextConfig;
