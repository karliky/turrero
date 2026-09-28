"use client";

import { useRef, useEffect, useState } from "react";

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
 * Nothing is requested (neither the poster nor the video) until the video enters the viewport,
 * and it pauses when it leaves: every video request goes through the /api/tweet-video/ proxy.
 */
export function GifVideo({ src, poster, alt }: { src: string; poster: string; alt?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const uploaded = isUploadedVideo(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.muted = true;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      inView.current = entry.isIntersecting;
      if (entry.isIntersecting) {
        setVisible(true);
        video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay={visible}
      loop={!uploaded}
      muted
      playsInline
      preload="none"
      controls={uploaded}
      poster={visible && poster ? poster : undefined}
      src={visible ? proxyVideoUrl(src) : undefined}
      onLoadedData={(e) => {
        if (inView.current) e.currentTarget.play().catch(() => {});
      }}
      onLoadedMetadata={() => setLoaded(true)}
      // Holds the space until the real size is known, so the text below does not jump
      className={`h-auto w-full rounded-lg ${loaded ? "" : "aspect-video bg-whiskey-100"}`}
      aria-label={alt || (uploaded ? "Video" : "GIF")}
    />
  );
}
