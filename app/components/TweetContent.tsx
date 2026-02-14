import { FaTwitter } from "react-icons/fa";
import { TweetProvider } from "../../infrastructure/TweetProvider";
import { Tweet, EnrichedTweetMetadata, TweetContentProps } from "../../infrastructure/types";
import Image from 'next/image';
import { GifVideo } from "./GifVideo";

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
        const legacyCaption =
          typeof (embed as unknown as Record<string, unknown>).caption === "string"
            ? String((embed as unknown as Record<string, unknown>).caption).trim()
            : "";
        const titleText = embed.title?.trim() || legacyCaption;
        const descriptionText = embed.description?.trim();
        const domainText = embed.domain?.trim();

        const isValidDomainLabel = (value?: string): boolean => {
          if (!value) return false;
          const clean = value.replace(/^from\s+/i, "").trim();
          // Avoid rendering non-domain text as the "domain" line
          if (clean.includes(" ")) return false;
          return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean);
        };
        const formatUrlForLabel = (url?: string): string | undefined => {
          if (!url || url === "#") return undefined;
          try {
            const parsed = new URL(url);
            const host = parsed.hostname.replace(/^www\./, "");
            const path = parsed.pathname.replace(/\/$/, "");
            const readable = `${host}${path}`;
            return readable.length > 85 ? `${readable.slice(0, 82)}...` : readable;
          } catch {
            return undefined;
          }
        };

        const headline =
          titleText ||
          formatUrlForLabel(href) ||
          (isValidDomainLabel(domainText) ? domainText : undefined) ||
          "Abrir enlace";
        const normalizeText = (value: string): string =>
          value
            .replace(/[“”"']/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
        const secondaryText =
          descriptionText &&
          (!titleText || normalizeText(descriptionText) !== normalizeText(titleText))
            ? descriptionText
            : undefined;

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
                {isValidDomainLabel(domainText) && (
                  <p className="text-xs text-whiskey-500 mb-1">{domainText}</p>
                )}
                <h3 className="font-medium text-whiskey-900 text-sm">
                  {headline}
                </h3>
                {secondaryText && (
                  <p className="mt-1 text-xs text-whiskey-600">{secondaryText}</p>
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
        const MediaContent = embed.video ? (
          <GifVideo
            src={embed.video}
            poster={normalizeImagePath(embed.img || '')}
          />
        ) : (
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
                {MediaContent}
              </div>
          </div>
        );
      }

      case 'embed': {
        const handle = getEmbeddedAuthorHandle(embed.author || '');
        const reconstructedUrl = embed.embeddedTweetId && embed.embeddedTweetId !== 'unknown'
          ? `https://x.com/${handle}/status/${embed.embeddedTweetId}`
          : `https://x.com/${handle}`;
        const href = embed.url || reconstructedUrl;
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
              {embed.img && (
                <div className="mt-3 overflow-hidden rounded-lg">
                  {embed.video ? (
                    <GifVideo
                      src={embed.video}
                      poster={normalizeImagePath(embed.img)}
                    />
                  ) : (
                    <Image
                      src={normalizeImagePath(embed.img)}
                      alt=""
                      width={400}
                      height={225}
                      className="h-auto w-full grayscale hover:grayscale-0 transition-all duration-300"
                      unoptimized={!embed.img.includes(".")}
                    />
                  )}
                </div>
              )}
            </div>
          </a>
        );
      }

      default:
        return null;
    }
  };

  const rawEmbeddings = getEmbeddings(tweet);

  // Inject video URLs into enriched entries from raw tweet data.
  // Enriched image/media entries are created in the same order as raw metadata.imgs,
  // so we match by position. Also derive MP4 from tweet_video_thumb poster URLs.
  const deriveGifVideoUrl = (posterUrl: string): string | undefined => {
    const match = posterUrl.match(/tweet_video_thumb\/([^?.]+)/);
    if (!match?.[1]) return undefined;
    return `https://video.twimg.com/tweet_video/${match[1]}.mp4`;
  };

  const rawImgs = tweet.metadata?.imgs || [];
  let imgIdx = 0;
  const embeddings = rawEmbeddings.map((e) => {
    if (e.type === 'image' || e.type === 'media') {
      const rawImg = rawImgs[imgIdx];
      imgIdx++;
      if (!e.video) {
        // Try raw tweet data first, then derive from poster URL patterns
        const videoUrl =
          rawImg?.video ||
          (rawImg?.img ? deriveGifVideoUrl(rawImg.img) : undefined) ||
          (e.img ? deriveGifVideoUrl(e.img) : undefined);
        if (videoUrl) return { ...e, video: videoUrl };
      }
    }
    return e;
  });

  const hasCard = embeddings.some((e) => e.type === "card" || isYoutubeCard(e));
  const hasMedia = embeddings.some((e) => e.type === "image" || e.type === "media");
  const hasEmbed = embeddings.some((e) => e.type === "embed");
  // Fallback: show images from raw tweet metadata when no media in enriched data
  // Also derive video URLs for GIFs that were scraped before video capture was added
  const fallbackImgs = (!hasMedia && tweet.metadata?.imgs?.length
    ? tweet.metadata.imgs
    : []
  ).map((img) => {
    if (!img.video && img.img) {
      const derived = deriveGifVideoUrl(img.img);
      if (derived) return { ...img, video: derived };
    }
    return img;
  });
  // Fallback: show card (link preview) from raw metadata when no card in enriched data
  const fallbackCard =
    !hasCard &&
    tweet.metadata?.type === "card" &&
    (tweet.metadata?.url || tweet.metadata?.title)
      ? tweet.metadata
      : null;
  // Fallback: show embedded tweet from raw metadata when no embed in enriched data
  const fallbackEmbedRaw =
    !hasEmbed && tweet.metadata?.embed?.author && tweet.metadata?.embed?.tweet
      ? tweet.metadata.embed
      : null;
  const fallbackEmbed = fallbackEmbedRaw && !fallbackEmbedRaw.video && fallbackEmbedRaw.img
    ? { ...fallbackEmbedRaw, video: deriveGifVideoUrl(fallbackEmbedRaw.img) }
    : fallbackEmbedRaw;

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
              {(() => {
                const legacyCaption =
                  typeof (fallbackCard as unknown as Record<string, unknown>).caption === "string"
                    ? String((fallbackCard as unknown as Record<string, unknown>).caption).trim()
                    : "";
                const title = fallbackCard.title?.trim() || legacyCaption;
                const description = fallbackCard.description?.trim();
                const normalizeText = (value: string): string =>
                  value
                    .replace(/[“”"']/g, "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();
                const showDescription =
                  !!description && (!title || normalizeText(description) !== normalizeText(title));
                return (
                  <>
                    <h3 className="font-medium text-whiskey-900 text-sm">
                      {title || fallbackCard.url}
                    </h3>
                    {showDescription && (
                      <p className="mt-1 text-xs text-whiskey-600">{description}</p>
                    )}
                  </>
                );
              })()}
            </div>
          </a>
        </div>
      )}
      {fallbackEmbed && (() => {
        const handle = getEmbeddedAuthorHandle(fallbackEmbed.author || '');
        const href = fallbackEmbed.url || (handle ? `https://x.com/${handle}` : '#');
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4"
            data-fallback-embed
          >
            <div className="p-4 border border-whiskey-200 rounded-lg hover:border-whiskey-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <FaTwitter className="text-whiskey-500" />
                <span className="text-sm font-medium text-whiskey-900">
                  {fallbackEmbed.author}
                </span>
              </div>
              <p className="text-whiskey-800">{fallbackEmbed.tweet}</p>
              {fallbackEmbed.img && (
                <div className="mt-3 overflow-hidden rounded-lg">
                  {fallbackEmbed.video ? (
                    <GifVideo
                      src={fallbackEmbed.video}
                      poster={normalizeImagePath(fallbackEmbed.img)}
                    />
                  ) : (
                    <Image
                      src={normalizeImagePath(fallbackEmbed.img)}
                      alt=""
                      width={400}
                      height={225}
                      className="h-auto w-full grayscale hover:grayscale-0 transition-all duration-300"
                      unoptimized={!fallbackEmbed.img.includes(".")}
                    />
                  )}
                </div>
              )}
            </div>
          </a>
        );
      })()}
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
                {item.video ? (
                  <GifVideo
                    src={item.video}
                    poster={item.img}
                  />
                ) : (
                  <Image
                    src={item.img}
                    alt=""
                    width={400}
                    height={300}
                    className="h-auto w-full rounded-lg grayscale hover:grayscale-0 transition-all duration-300"
                    unoptimized={!item.img.startsWith("/") && !item.img.includes("./")}
                  />
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
