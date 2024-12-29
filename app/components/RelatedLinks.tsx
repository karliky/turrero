'use client'
import { EnrichedTweetMetadata } from '../../infrastructure/TweetProvider';
import { FaYoutube, FaWikipediaW, FaBook, FaLinkedin } from "react-icons/fa";

interface RelatedLinksProps {
  enrichedData: EnrichedTweetMetadata[];
}

export function RelatedLinks({ enrichedData }: RelatedLinksProps) {
  const isValidDomain = (url: string) => {
    return url.includes("youtube.com") ||
           (url.includes("goodreads.com") && !url.includes("user_challenges")) ||
           url.includes("wikipedia.org") ||
           url.includes("linkedin.com");
  };

  const getIcon = (url: string) => {
    if (url.includes("youtube.com")) return <FaYoutube className="text-xl" />;
    if (url.includes("goodreads.com")) return <FaBook className="text-xl" />;
    if (url.includes("wikipedia.org")) return <FaWikipediaW className="text-xl" />;
    if (url.includes("linkedin.com")) return <FaLinkedin className="text-xl" />;
    return null;
  };

  const cardLinks = enrichedData.filter(data => 
    data.type === 'card' && data.url && isValidDomain(data.url)
  );
  
  if (cardLinks.length === 0) return null;

  return (
    <div className="space-y-6 bg-white/50 backdrop-blur-sm p-6 rounded-lg border border-whiskey-200 shadow-sm">
      <h2 className="text-2xl font-bold text-whiskey-900">Enlaces relacionados</h2>
      <ul className="space-y-2">
        {cardLinks.map((data, index) => (
          <li key={index}>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left p-3 rounded-md transition-all duration-200
                hover:bg-whiskey-50 text-whiskey-700"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {data.url && getIcon(data.url)}
                </div>
                <span className="line-clamp-2">{data.title}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}