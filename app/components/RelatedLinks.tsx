'use client'
import { EnrichedTweetMetadata, Tweet } from '../../infrastructure/types';
import { FaYoutube, FaWikipediaW, FaBook, FaLinkedin } from "react-icons/fa";

interface RelatedLinksProps {
  enrichedData: EnrichedTweetMetadata[];
  thread: Tweet[];
}

export function RelatedLinks({ enrichedData, thread }: RelatedLinksProps) {
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

  const simpleLinks = thread
    .flatMap(tweet => {
      const urls = tweet.tweet.match(/https?:\/\/[^\s)]+/g) || [];
      return urls.filter(url => isValidDomain(url));
    })
    .filter(url => 
      !enrichedData.some(data => data.url === url)
    );

  const groupedLinks = cardLinks.reduce((acc, data) => {
    if (!data.url) return acc;
    
    let category = '';
    if (data.url.includes('youtube.com')) category = 'Videos';
    else if (data.url.includes('goodreads.com')) category = 'Libros';
    else if (data.url.includes('wikipedia.org')) category = 'Wikipedia';
    else if (data.url.includes('linkedin.com')) category = 'LinkedIn';
    
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