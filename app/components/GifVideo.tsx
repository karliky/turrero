"use client";

import { useRef, useEffect } from "react";

/**
 * Proxy video URL through Next.js API route to avoid Twitter CDN 403 (Referer check).
 * video.twimg.com/tweet_video/ID.mp4 → /api/tweet-video/tweet_video/ID.mp4
 * video.twimg.com/ext_tw_video/ID/... → /api/tweet-video/ext_tw_video/ID/...
 */
function proxyVideoUrl(url: string): string {
  return url.replace("https://video.twimg.com/", "/api/tweet-video/");
}

/**
 * Detect uploaded videos (ext_tw_video) vs GIFs (tweet_video).
 * Uploaded videos get playback controls; GIFs autoplay in a loop silently.
 */
function isUploadedVideo(url: string): boolean {
  return url.includes("ext_tw_video");
}

/**
 * Renders Twitter media videos (both GIFs and uploaded videos).
 *
 * - GIFs (tweet_video/): autoplay, loop, muted, no controls
 * - Uploaded videos (ext_tw_video/): autoplay muted, controls visible, no loop
 *
 * All videos are proxied through /api/tweet-video/ to bypass Twitter CDN Referer checks.
 */
export function GifVideo({ src, poster, alt }: { src: string; poster: string; alt?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const proxiedSrc = proxyVideoUrl(src);
  const uploaded = isUploadedVideo(src);

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
      loop={!uploaded}
      muted
      playsInline
      controls={uploaded}
      poster={poster}
      src={proxiedSrc}
      className="h-auto w-full rounded-lg"
      aria-label={alt || (uploaded ? "Video" : "GIF")}
    />
  );
}
