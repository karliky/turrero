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
  if (/youtube\.com|youtu\.be/.test(domain)) return <FaYoutube className="text-sm" />;
  if (domain.includes('goodreads.com')) return <FaBook className="text-sm" />;
  if (domain.includes('wikipedia.org')) return <FaWikipediaW className="text-sm" />;
  if (domain.includes('linkedin.com')) return <FaLinkedin className="text-sm" />;
  return <FaLink className="text-sm" />;
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
    <ul className="-mx-2 space-y-0.5">
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-whiskey-50"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-whiskey-100 text-whiskey-800 transition-colors group-hover:bg-brand group-hover:text-whiskey-50">
              {icon(link.domain)}
            </span>
            <span className="min-w-0 leading-snug text-whiskey-950 line-clamp-2 [overflow-wrap:anywhere] group-hover:underline decoration-whiskey-300 underline-offset-2">
              {link.label}
            </span>
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
    <section className="rounded-xl border border-whiskey-200 border-t-[3px] border-t-brand bg-surface p-5 shadow-sm">
      <h2 className="font-serif text-xl font-bold text-whiskey-950">Enlaces de esta turra</h2>
      <div className="mt-4 space-y-5">
        {[...groups].map(([name, links]) => (
          <div key={name} className="space-y-1">
            <h3 className="text-sm font-semibold text-whiskey-800 [overflow-wrap:anywhere]">{name}</h3>
            <LinkList links={links} />
          </div>
        ))}
        {textLinks.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-whiskey-800">Otros enlaces</h3>
            <LinkList links={textLinks} />
          </div>
        )}
      </div>
    </section>
  );
}
