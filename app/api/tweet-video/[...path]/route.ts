import { NextResponse } from "next/server";

// GIFs (tweet_video) and uploaded videos (ext_tw_video) of the archive; nothing else is proxied
const ALLOWED = /^(tweet_video|ext_tw_video)\/[\w./-]+\.mp4$/;

// Headers of the CDN response that the browser needs to seek and to play on Safari (which requests ranges)
const PASSED = ["content-length", "content-range", "accept-ranges", "etag", "last-modified"];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const videoPath = (await params).path.join("/");
  if (!ALLOWED.test(videoPath) || videoPath.includes("..")) {
    return new NextResponse(null, { status: 404 });
  }

  const range = request.headers.get("range");
  const response = await fetch(`https://video.twimg.com/${videoPath}`, {
    headers: {
      // No Referer — Twitter CDN blocks non-Twitter referrers
      "User-Agent": "Mozilla/5.0",
      ...(range ? { Range: range } : {}),
    },
  });

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  const headers = new Headers({
    "Content-Type": "video/mp4",
    // s-maxage lets Vercel's CDN keep the video, so each GIF costs one function call, not one per view
    "Cache-Control": "public, max-age=604800, s-maxage=31536000, immutable",
  });
  for (const name of PASSED) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(response.body, { status: response.status, headers });
}
