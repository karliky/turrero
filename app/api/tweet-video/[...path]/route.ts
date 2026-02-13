import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const videoPath = path.join("/");
  const videoUrl = `https://video.twimg.com/${videoPath}`;

  const response = await fetch(videoUrl, {
    headers: {
      // No Referer — Twitter CDN blocks non-Twitter referrers
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
