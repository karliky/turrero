import type { NextConfig } from "next";
import { LEGACY_CATEGORY_URLS } from "./lib/site";
// Images saved without an extension, renamed by scripts/fix-metadata-extensions.ts
import METADATA_RENAMES from "./data/metadata-renames.json";

const nextConfig: NextConfig = {
  // Images are served as-is (local /metadata files and pbs.twimg.com)
  images: { unoptimized: true },
  // Route handlers that read the database at request time need the file in their bundle
  outputFileTracingIncludes: {
    "/api/search": ["./data/turrero.db"],
    "/turra/[id]": ["./data/turrero.db"],
  },
  // Nothing at request time needs these: public/ is served by the CDN, sharp only processes images in the
  // ebook script (images are unoptimized), and the rest are sources or local caches
  outputFileTracingExcludes: {
    "*": [
      "./public/**",
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
      "./.cache/**",
      "./data/categorization/**",
      "./data/glossary/drafts/**",
      "./design/**",
    ],
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
      // A truncated external link to the sociology category
      { source: "/sociolog", destination: "/sociologia", permanent: true },
    ];
    const images = Object.entries(METADATA_RENAMES).map(([source, destination]) => ({ source, destination, permanent: true }));
    const categories = Object.entries(LEGACY_CATEGORY_URLS).flatMap(([slug, destination]) =>
      [...new Set([`/${slug}`, `/${encodeURIComponent(slug)}`])].map((source) => ({
        source,
        destination,
        permanent: true,
      })),
    );
    return [...pages, ...categories, ...images];
  },
};

export default nextConfig;
