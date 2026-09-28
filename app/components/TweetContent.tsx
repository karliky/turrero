import { FaTwitter } from "react-icons/fa";
import { CopyTweetLink } from "./CopyTweetLink";
import { GifVideo } from "./GifVideo";
import { GlossaryTerm } from "./GlossaryTerm";
import { LazyImage } from "./LazyImage";
import type { Link, Media, Quote, Tweet } from "@/lib/types";
import { tweetUrl } from "@/lib/site";

const linkClassName = "text-whiskey-700 hover:text-whiskey-900 underline decoration-whiskey-300 transition-colors";

/** A glossary term found in this tweet (see lib/glossary-links.ts). */
export interface TermLink {
  start: number;
  end: number;
  slug: string;
  term: string;
  short: string;
}

/** Links glossary terms, @mentions and URLs inside the tweet text. */
function renderText(text: string, terms: TermLink[] = []): (string | React.ReactElement | null)[] {
  const parts: (string | React.ReactElement | null)[] = [];
  let cursor = 0;
  for (const term of terms) {
    parts.push(...renderPlain(text.slice(cursor, term.start), `p${cursor}`));
    parts.push(
      <GlossaryTerm key={`g${term.start}`} slug={term.slug} term={term.term} short={term.short}>
        {text.slice(term.start, term.end)}
      </GlossaryTerm>,
    );
    cursor = term.end;
  }
  parts.push(...renderPlain(text.slice(cursor), `p${cursor}`));
  return parts;
}

/** Links @mentions and URLs. */
function renderPlain(text: string, keyPrefix: string): (string | React.ReactElement | null)[] {
  return text.split(/(@\w+)|(https?:\/\/[^\s]+)/g).map((part, i) => {
    const index = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('@')) {
      return (
        <a key={index} href={`https://x.com/${part.slice(1)}`} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {part}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.…]{2,}|…$/g, '');
      return (
        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {url.length > 50 ? `${url.slice(0, 47)}...` : url}
        </a>
      );
    }
    return part;
  });
}

function MediaItem({ media }: { media: Media }) {
  if (media.kind === 'photo') {
    return (
      <LazyImage
        src={media.url}
        alt={media.alt ?? ''}
        width={400}
        height={300}
        // Real white behind the photo: some are transparent diagrams with black text, unreadable on the dark theme
        className="h-auto w-full bg-white"
        placeholderClassName="aspect-[4/3] w-full bg-whiskey-100"
      />
    );
  }
  return <GifVideo src={media.url} poster={media.posterUrl ?? ''} alt={media.alt ?? ''} />;
}

function readableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const readable = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}`;
    return readable.length > 85 ? `${readable.slice(0, 82)}...` : readable;
  } catch {
    return url;
  }
}

const normalize = (value: string) => value.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function LinkCard({ link }: { link: Link }) {
  const headline = link.title ?? readableUrl(link.url);
  const description =
    link.description && (!link.title || normalize(link.description) !== normalize(link.title)) ? link.description : null;

  return (
    <div className="flex justify-center mt-4">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors inline-block max-w-[400px]"
      >
        {link.imageUrl && (
          <LazyImage
            src={link.imageUrl}
            alt={link.title ?? ''}
            width={400}
            height={266}
            placeholderClassName="aspect-[400/266] w-[400px] max-w-full bg-whiskey-100"
            className="h-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
        )}
        <div className="p-4">
          <p className="text-xs text-whiskey-700 mb-1">{link.domain}</p>
          <h3 className="font-medium text-whiskey-900 text-sm">{headline}</h3>
          {description && <p className="mt-1 text-xs text-whiskey-700">{description}</p>}
        </div>
      </a>
    </div>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  const href =
    quote.authorHandle && quote.quotedId
      ? tweetUrl(quote.authorHandle, quote.quotedId)
      : quote.authorHandle
        ? `https://x.com/${quote.authorHandle}`
        : undefined;
  const author = [quote.authorName, quote.authorHandle && `@${quote.authorHandle}`].filter(Boolean).join(' ');

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block mt-4">
      <div className="p-4 border border-whiskey-200 rounded-lg hover:border-whiskey-300 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <FaTwitter className="text-whiskey-700" />
          <span className="text-sm font-medium text-whiskey-900">{author}</span>
        </div>
        <p className="text-whiskey-800 whitespace-pre-line">{quote.text}</p>
        {quote.media.map((media, index) => (
          <div key={index} className="mt-3 overflow-hidden rounded-lg bg-whiskey-100">
            <MediaItem media={media} />
          </div>
        ))}
      </div>
    </a>
  );
}

export function TweetContent({ tweet, terms = [] }: { tweet: Tweet; terms?: TermLink[] }) {
  return (
    <div id={tweet.id} className="group scroll-mt-6">
      <p className="text-lg leading-relaxed text-whiskey-800">
        {renderText(tweet.text, terms)}
        <CopyTweetLink tweetId={tweet.id} />
      </p>
      {tweet.media.length > 0 && (
        <div className="not-prose mt-4 max-w-[400px] mx-auto space-y-2">
          {tweet.media.map((media, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-whiskey-200 bg-whiskey-100 hover:border-whiskey-300 transition-colors">
              <MediaItem media={media} />
            </div>
          ))}
        </div>
      )}
      {tweet.links.map((link) => (
        <LinkCard key={link.url} link={link} />
      ))}
      {tweet.quote && <QuoteCard quote={tweet.quote} />}
    </div>
  );
}
