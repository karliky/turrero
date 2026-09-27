import { FaYoutube, FaWikipediaW, FaBook, FaLinkedin, FaLink } from "react-icons/fa";
import type { Tweet } from "@/lib/types";

// Links mentioned only in the text (no card) are listed when they point to these sites.
const NOTABLE_SITES = /youtube\.com|youtu\.be|goodreads\.com|wikipedia\.org|linkedin\.com/;

function groupName(domain: string): string {
  if (/youtube\.com|youtu\.be/.test(domain)) return 'Videos';
  if (domain.includes('goodreads.com')) return 'Libros';
  if (domain.includes('wikipedia.org')) return 'Wikipedia';
  if (domain.includes('linkedin.com')) return 'LinkedIn';
  return domain;
}

function icon(domain: string): React.ReactElement {
  if (/youtube\.com|youtu\.be/.test(domain)) return <FaYoutube className="text-xl" />;
  if (domain.includes('goodreads.com')) return <FaBook className="text-xl" />;
  if (domain.includes('wikipedia.org')) return <FaWikipediaW className="text-xl" />;
  if (domain.includes('linkedin.com')) return <FaLinkedin className="text-xl" />;
  return <FaLink className="text-xl" />;
}

function label(url: string): string {
  try {
    const parsed = new URL(url);
    const readable = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}`;
    return readable.length > 85 ? `${readable.slice(0, 82)}...` : readable;
  } catch {
    return url;
  }
}

interface RelatedLink {
  url: string;
  domain: string;
  label: string;
}

function LinkList({ links }: { links: RelatedLink[] }) {
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-left p-3 rounded-md transition-all duration-200 hover:bg-whiskey-50 text-whiskey-700"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-1">{icon(link.domain)}</div>
              <span className="line-clamp-2">{link.label}</span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function RelatedLinks({ tweets }: { tweets: Tweet[] }) {
  const cardLinks = new Map<string, RelatedLink>();
  for (const link of tweets.flatMap((tweet) => tweet.links)) {
    cardLinks.set(link.url, { url: link.url, domain: link.domain, label: link.title ?? label(link.url) });
  }

  const textLinks = [
    ...new Set(tweets.flatMap((tweet) => tweet.text.match(/https?:\/\/[^\s)]+/g) ?? [])),
  ]
    .filter((url) => NOTABLE_SITES.test(url) && !cardLinks.has(url))
    .map((url) => ({ url, domain: url, label: url }));

  const groups = new Map<string, RelatedLink[]>();
  for (const link of cardLinks.values()) {
    const name = groupName(link.domain);
    groups.set(name, [...(groups.get(name) ?? []), link]);
  }

  if (groups.size === 0 && textLinks.length === 0) return null;

  return (
    <div className="space-y-4 bg-white/50 backdrop-blur-xs p-4 rounded-lg border border-whiskey-200 shadow-xs">
      <h2 className="text-lg font-bold text-whiskey-900">Enlaces relacionados</h2>
      <div className="space-y-4">
        {[...groups].map(([name, links]) => (
          <div key={name} className="space-y-2">
            <h3 className="text-sm font-semibold text-whiskey-800">{name}</h3>
            <LinkList links={links} />
          </div>
        ))}
        {textLinks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-whiskey-800">Otros enlaces</h3>
            <LinkList links={textLinks} />
          </div>
        )}
      </div>
    </div>
  );
}
