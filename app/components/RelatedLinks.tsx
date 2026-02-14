'use client'
import { EnrichedTweetMetadata, Tweet } from '../../infrastructure/types';
import { FaYoutube, FaWikipediaW, FaBook, FaLinkedin, FaLink } from "react-icons/fa";

interface RelatedLinksProps {
  enrichedData: EnrichedTweetMetadata[];
  thread: Tweet[];
}

export function RelatedLinks({ enrichedData, thread }: RelatedLinksProps) {
  const isLikelyDomain = (value?: string): boolean => {
    if (!value) return false;
    const clean = value.replace(/^from\s+/i, "").trim().toLowerCase();
    if (clean.includes(" ")) return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean);
  };

  const normalizeDomain = (value: string): string =>
    value.replace(/^from\s+/i, "").trim().toLowerCase().replace(/^www\./, '');

  const extractHostname = (url?: string): string | undefined => {
    if (!url || url === '#') return undefined;
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return undefined;
    }
  };

  const formatUrlForLabel = (url?: string): string | undefined => {
    if (!url || url === '#') return undefined;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      const path = parsed.pathname.replace(/\/$/, '');
      const readable = `${host}${path}`;
      return readable.length > 85 ? `${readable.slice(0, 82)}...` : readable;
    } catch {
      return undefined;
    }
  };

  const isValidDomain = (url: string) => {
    return url.includes("youtube.com") ||
           url.includes("youtu.be") ||
           (url.includes("goodreads.com") && !url.includes("user_challenges")) ||
           url.includes("wikipedia.org") ||
           url.includes("linkedin.com");
  };

  const getIcon = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return <FaYoutube className="text-xl" />;
    if (url.includes("goodreads.com")) return <FaBook className="text-xl" />;
    if (url.includes("wikipedia.org")) return <FaWikipediaW className="text-xl" />;
    if (url.includes("linkedin.com")) return <FaLinkedin className="text-xl" />;
    return <FaLink className="text-xl" />;
  };

  const isValidCard = (data: EnrichedTweetMetadata) => {
    if (data.type !== 'card') return false;
    // Accept cards with a URL or a known domain (YouTube cards may have empty URLs)
    return !!(data.url?.trim()) || !!(data.domain?.trim()) || !!(data.title?.trim());
  };

  const getEffectiveUrl = (data: EnrichedTweetMetadata): string => {
    if (data.url?.trim()) return data.url;
    if (data.domain?.includes('youtube.com') && data.title?.trim()) {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(data.title.trim())}`;
    }
    return '#';
  };

  const getResolvedDomain = (data: EnrichedTweetMetadata): string | undefined => {
    if (isLikelyDomain(data.domain)) return normalizeDomain(data.domain!.trim());
    const effectiveUrl = getEffectiveUrl(data);
    return extractHostname(effectiveUrl);
  };

  const getCardLabel = (data: EnrichedTweetMetadata): string => {
    const legacyCaption =
      typeof (data as unknown as Record<string, unknown>).caption === 'string'
        ? String((data as unknown as Record<string, unknown>).caption).trim()
        : '';
    const title = data.title?.trim() || legacyCaption;
    if (title) return title;
    const effectiveUrl = getEffectiveUrl(data);
    const readableUrl = formatUrlForLabel(effectiveUrl);
    if (readableUrl) return readableUrl;
    const domain = getResolvedDomain(data);
    return domain || 'Abrir enlace';
  };

  const cardLinks = enrichedData.filter(isValidCard);

  const simpleLinks = thread
    .flatMap(tweet => {
      const urls = tweet.tweet.match(/https?:\/\/[^\s)]+/g) || [];
      return urls.filter(url => isValidDomain(url));
    })
    .filter(url => 
      !enrichedData.some(data => data.url === url)
    );

  const groupedLinks = cardLinks.reduce((acc, data) => {
    const domain = getResolvedDomain(data) || '';

    let category = '';
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) category = 'Videos';
    else if (domain.includes('goodreads.com')) category = 'Libros';
    else if (domain.includes('wikipedia.org')) category = 'Wikipedia';
    else if (domain.includes('linkedin.com')) category = 'LinkedIn';
    else {
      category = domain || 'Otros enlaces';
    }

    if (!acc[category]) acc[category] = [];
    acc[category]!.push(data);
    return acc;
  }, {} as Record<string, EnrichedTweetMetadata[]>);
  
  if (Object.keys(groupedLinks).length === 0 && simpleLinks.length === 0) return null;

  return (
    <div className="space-y-4 bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-whiskey-200 shadow-sm">
      <h2 className="text-lg font-bold text-whiskey-900">Enlaces relacionados</h2>
      <div className="space-y-4">
        {Object.entries(groupedLinks).map(([category, links]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-semibold text-whiskey-800">{category}</h3>
            <ul className="space-y-2">
              {links.map((data, index) => (
                <li key={index}>
                  <a
                    href={getEffectiveUrl(data)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left p-3 rounded-md transition-all duration-200
                      hover:bg-whiskey-50 text-whiskey-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(getResolvedDomain(data) || getEffectiveUrl(data))}
                      </div>
                      <span className="line-clamp-2">{getCardLabel(data)}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {simpleLinks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-whiskey-800">Otros enlaces</h3>
            <ul className="space-y-2">
              {simpleLinks.map((url, index) => (
                <li key={index}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left p-3 rounded-md transition-all duration-200
                      hover:bg-whiskey-50 text-whiskey-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(url)}
                      </div>
                      <span className="line-clamp-2">{url}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
