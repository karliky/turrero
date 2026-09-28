import type { NextConfig } from "next";
import { LEGACY_CATEGORY_URLS } from "./lib/site";

const nextConfig: NextConfig = {
  // Images are served as-is (local /metadata files and pbs.twimg.com)
  images: { unoptimized: true },
  // Route handlers that read the database at request time need the file in their bundle
  outputFileTracingIncludes: {
    "/api/search": ["./data/turrero.db"],
    "/turra/[id]": ["./data/turrero.db"],
  },
  async headers() {
    return [
      {
        source: "/ebook/:file*.epub",
        headers: [
          { key: "Content-Type", value: "application/epub+zip" },
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
    ];
  },
  async redirects() {
    // The reading guide was the "Hall of Fame" until September 2026
    const pages = [
      { source: "/hall-of-fame", destination: "/empieza-aqui", permanent: true },
      // Pages retired in September 2026: the PDF became the EPUB, the graph became the idea map
      { source: "/version-en-pdf", destination: "/ebook", permanent: true },
      { source: "/grafo-de-turras", destination: "/mapa-de-ideas", permanent: true },
    ];
    const categories = Object.entries(LEGACY_CATEGORY_URLS).flatMap(([slug, destination]) =>
      [...new Set([`/${slug}`, `/${encodeURIComponent(slug)}`])].map((source) => ({
        source,
        destination,
        permanent: true,
      })),
    );
    return [...pages, ...categories];
  },
};

export default nextConfig;
