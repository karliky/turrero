import { FaTwitter } from "react-icons/fa";
import { TweetProvider } from "../../infrastructure/TweetProvider";
import { Tweet, EnrichedTweetMetadata, TweetContentProps } from "../../infrastructure/types";
import Image from 'next/image';

export function TweetContent({ tweet, id }: TweetContentProps) {
  const renderMentions = (text: string): (string | React.ReactElement | null)[] => {
    // Regex for URLs and mentions
    const regex = /(@\w+)|(https?:\/\/[^\s]+)/g;
    return text.split(regex).map((part, index) => {
      if (!part) return null;
      if (part.startsWith('@')) {
        const handle = part.substring(1);
        return (
          <a
            key={index}
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-whiskey-600 hover:text-whiskey-800 transition-colors"
          >
            {part}
          </a>
        );
      }
      if (part.match(/^https?:\/\//)) {
        // Handle all ellipsis variations and truncate long URLs
        const cleanUrl = part.replace(/[.…]{2,}|…$/g, '');
        const displayText = cleanUrl.length > 50 
          ? cleanUrl.substring(0, 47) + '...' 
          : cleanUrl;
        
        return (
          <a
            key={index}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-whiskey-600 hover:text-whiskey-800 transition-colors"
          >
            {displayText}
          </a>
        );
      }
      return part;
    });
  };

  const getEmbedding = (tweet: Tweet): EnrichedTweetMetadata | undefined => {
    return new TweetProvider().getEnrichedTweetData(tweet.id);
  };

  const getEmbeddedAuthorHandle = (author: string): string => {
    return author.split('@')[1] || author.split('\n@')[1] || '';
  };

  const normalizeImagePath = (path: string): string => {
    return path?.startsWith('./') ? path.substring(1) : path;
  };

  const renderEmbed = (embed: EnrichedTweetMetadata): React.ReactElement | null => {
    switch (embed.type) {
      case 'card':
        return (
          <div className="flex justify-center mt-4">
            <a 
              href={embed.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors inline-block max-w-[400px]"
            >
              {embed.img && (
                <div className="relative">
                  <Image
                    src={normalizeImagePath(embed.img)}
                    alt={embed.title || ''}
                    width={400}
                    height={266}
                    className="h-auto grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                {embed.domain && (
                  <p className="text-xs text-whiskey-500 mb-1">{embed.domain}</p>
                )}
                <h3 className="font-medium text-whiskey-900 text-sm">
                  {embed.title?.trim() ? embed.title : embed.url}
                </h3>
                {embed.description && (
                  <p className="mt-1 text-xs text-whiskey-600">{embed.description}</p>
                )}
              </div>
            </a>
          </div>
        );

      case 'media':
        const MediaImage = (
          <Image
            src={normalizeImagePath(embed.img || '')}
            alt=""
            width={300}
            height={200}
            className="h-auto w-full rounded-lg grayscale hover:grayscale-0 transition-all duration-300"
          />
        );

        return (
          <div className="mt-4 max-w-[400px] mx-auto">
              <div className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors">
                {MediaImage}
              </div>
          </div>
        );

      case 'embed':
        return (
          <a
            href={`https://x.com/${getEmbeddedAuthorHandle(embed.author || '')}/status/${embed.embeddedTweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4"
          >
            <div className="p-4 border border-whiskey-200 rounded-lg hover:border-whiskey-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <FaTwitter className="text-whiskey-500" />
                <span className="text-sm font-medium text-whiskey-900">
                  {embed.author}
                </span>
              </div>
              <p className="text-whiskey-800">{embed.tweet}</p>
            </div>
          </a>
        );
    }
  };

  const embed = getEmbedding(tweet);
  return (
    <div id={id}>
      <p className="text-lg leading-relaxed text-whiskey-800">
        {renderMentions(tweet.tweet)}
      </p>
      {embed && renderEmbed(embed)}
    </div>
  );
} 