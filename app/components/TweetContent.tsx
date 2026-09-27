import { FaTwitter } from "react-icons/fa";
import Image from 'next/image';
import { GifVideo } from "./GifVideo";
import type { Link, Media, Quote, Tweet } from "@/lib/types";
import { tweetUrl } from "@/lib/site";

const linkClassName = "text-whiskey-600 hover:text-whiskey-800 transition-colors";

/** Links @mentions and URLs inside the tweet text. */
function renderText(text: string): (string | React.ReactElement | null)[] {
  return text.split(/(@\w+)|(https?:\/\/[^\s]+)/g).map((part, index) => {
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
      <Image
        src={media.url}
        alt={media.alt ?? ''}
        width={400}
        height={300}
        className="h-auto w-full grayscale hover:grayscale-0 transition-all duration-300"
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
          <Image
            src={link.imageUrl}
            alt={link.title ?? ''}
            width={400}
            height={266}
            className="h-auto grayscale hover:grayscale-0 transition-all duration-300"
          />
        )}
        <div className="p-4">
          <p className="text-xs text-whiskey-500 mb-1">{link.domain}</p>
          <h3 className="font-medium text-whiskey-900 text-sm">{headline}</h3>
          {description && <p className="mt-1 text-xs text-whiskey-600">{description}</p>}
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
          <FaTwitter className="text-whiskey-500" />
          <span className="text-sm font-medium text-whiskey-900">{author}</span>
        </div>
        <p className="text-whiskey-800 whitespace-pre-line">{quote.text}</p>
        {quote.media.map((media, index) => (
          <div key={index} className="mt-3 overflow-hidden rounded-lg">
            <MediaItem media={media} />
          </div>
        ))}
      </div>
    </a>
  );
}

export function TweetContent({ tweet }: { tweet: Tweet }) {
  return (
    <div id={tweet.id}>
      <p className="text-lg leading-relaxed text-whiskey-800">{renderText(tweet.text)}</p>
      {tweet.media.length > 0 && (
        <div className="not-prose mt-4 max-w-[400px] mx-auto space-y-2">
          {tweet.media.map((media, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors">
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
