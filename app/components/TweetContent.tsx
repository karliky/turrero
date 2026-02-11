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

  const tweetProvider = new TweetProvider();
  const getEmbeddings = (tweet: Tweet): EnrichedTweetMetadata[] => {
    return tweetProvider.getAllEnrichedTweetData(tweet.id);
  };

  const getEmbeddedAuthorHandle = (author: string): string => {
    return author.split('@')[1] || author.split('\n@')[1] || '';
  };

  const normalizeImagePath = (path: string): string => {
    return path?.startsWith('./') ? path.substring(1) : path;
  };

  const isYoutubeCard = (e: EnrichedTweetMetadata) =>
    e.domain === "youtube.com" || e.media === "youtube";
  const youtubeSearchHref = (e: EnrichedTweetMetadata) =>
    e.url?.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(e.title?.trim() || "")}`;

  const renderEmbed = (embed: EnrichedTweetMetadata): React.ReactElement | null => {
    switch (embed.type) {
      case 'card': {
        const href = isYoutubeCard(embed) ? youtubeSearchHref(embed) : (embed.url || "#");
        return (
          <div className="flex justify-center mt-4">
            <a 
              href={href}
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
                    unoptimized={!embed.img.includes(".")}
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
      }

      case 'image':
      case 'media': {
        if (isYoutubeCard(embed)) {
          return (
            <div className="flex justify-center mt-4">
              <a
                href={youtubeSearchHref(embed)}
                target="_blank"
                rel="noopener noreferrer"
                className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors inline-block max-w-[400px]"
              >
                {embed.img && (
                  <div className="relative">
                    <Image
                      src={normalizeImagePath(embed.img)}
                      alt={embed.title || ""}
                      width={400}
                      height={266}
                      className="h-auto grayscale hover:grayscale-0 transition-all duration-300"
                      unoptimized={!embed.img.includes(".")}
                    />
                  </div>
                )}
                <div className="p-4">
                  {embed.domain && (
                    <p className="text-xs text-whiskey-500 mb-1">{embed.domain}</p>
                  )}
                  <h3 className="font-medium text-whiskey-900 text-sm">
                    {embed.title?.trim() || "YouTube"}
                  </h3>
                </div>
              </a>
            </div>
          );
        }
        const MediaImage = (
          <Image
            src={normalizeImagePath(embed.img || '')}
            alt=""
            width={300}
            height={200}
            className="h-auto w-full rounded-lg grayscale hover:grayscale-0 transition-all duration-300"
            unoptimized={embed.img ? !embed.img.includes(".") : false}
          />
        );

        return (
          <div className="mt-4 max-w-[400px] mx-auto">
              <div className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors">
                {MediaImage}
              </div>
          </div>
        );
      }

      case 'embed': {
        const handle = getEmbeddedAuthorHandle(embed.author || '');
        const href = embed.embeddedTweetId && embed.embeddedTweetId !== 'unknown'
          ? `https://x.com/${handle}/status/${embed.embeddedTweetId}`
          : `https://x.com/${handle}`;
        return (
          <a
            href={href}
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

      default:
        return null;
    }
  };

  const embeddings = getEmbeddings(tweet);
  const hasCard = embeddings.some((e) => e.type === "card");
  const hasMedia = embeddings.some((e) => e.type === "image" || e.type === "media");
  // Fallback: show images from raw tweet metadata when no media in enriched data
  const fallbackImgs =
    !hasMedia && tweet.metadata?.imgs?.length ? tweet.metadata.imgs : [];
  // Fallback: show card (link preview) from raw metadata when no card in enriched data
  const fallbackCard =
    !hasCard &&
    tweet.metadata?.type === "card" &&
    (tweet.metadata?.url || tweet.metadata?.title)
      ? tweet.metadata
      : null;

  return (
    <div id={id}>
      <p className="text-lg leading-relaxed text-whiskey-800">
        {renderMentions(tweet.tweet)}
      </p>
      {embeddings.map((embed, i) => {
        const rendered = renderEmbed(embed);
        return rendered ? <div key={`${id}-${i}`}>{rendered}</div> : null;
      })}
      {fallbackCard && (
        <div className="not-prose flex justify-center mt-4" data-fallback-card>
          <a
            href={fallbackCard.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors inline-block max-w-[400px] w-full bg-whiskey-50/50 p-0"
          >
            {fallbackCard.img && (
              <div className="relative">
                <Image
                  src={fallbackCard.img.startsWith("/") || fallbackCard.img.startsWith(".")
                    ? normalizeImagePath(fallbackCard.img)
                    : fallbackCard.img
                  }
                  alt={fallbackCard.title || ""}
                  width={400}
                  height={266}
                  className="h-auto grayscale hover:grayscale-0 transition-all duration-300"
                  unoptimized={!fallbackCard.img.includes(".")}
                />
              </div>
            )}
            <div className="p-4">
              {fallbackCard.domain && (
                <p className="text-xs text-whiskey-500 mb-1">{fallbackCard.domain}</p>
              )}
              <h3 className="font-medium text-whiskey-900 text-sm">
                {fallbackCard.title?.trim() ? fallbackCard.title : fallbackCard.url}
              </h3>
              {fallbackCard.description && (
                <p className="mt-1 text-xs text-whiskey-600">{fallbackCard.description}</p>
              )}
            </div>
          </a>
        </div>
      )}
      {fallbackImgs.length > 0 && (
        <div className="not-prose mt-4 max-w-[400px] mx-auto">
          <div className="overflow-hidden rounded-lg border border-whiskey-200 hover:border-whiskey-300 transition-colors space-y-2">
            {fallbackImgs.map((item, i) => (
              <a
                key={`${id}-fallback-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Image
                  src={item.img}
                  alt=""
                  width={400}
                  height={300}
                  className="h-auto w-full rounded-lg grayscale hover:grayscale-0 transition-all duration-300"
                  unoptimized={!item.img.startsWith("/") && !item.img.includes("./")}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 