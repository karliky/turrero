"use client";

import { useRef, useEffect } from "react";

/**
 * Proxy video URL through Next.js API route to avoid Twitter CDN 403 (Referer check).
 * video.twimg.com/tweet_video/ID.mp4 → /api/tweet-video/tweet_video/ID.mp4
 */
function proxyVideoUrl(url: string): string {
  return url.replace("https://video.twimg.com/", "/api/tweet-video/");
}

export function GifVideo({ src, poster, alt }: { src: string; poster: string; alt?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const proxiedSrc = proxyVideoUrl(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    tryPlay();
    video.addEventListener("loadeddata", tryPlay, { once: true });

    return () => {
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      src={proxiedSrc}
      className="h-auto w-full rounded-lg"
      aria-label={alt || "GIF"}
    />
  );
}
