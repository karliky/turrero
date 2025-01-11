import { NextRequest } from 'next/server';
import { Jimp, loadFont, HorizontalAlign, VerticalAlign } from 'jimp';
import { SANS_32_BLACK } from 'jimp/fonts';
import { TweetProvider } from '../../../../infrastructure/TweetProvider';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the tweet summary
    const tweetProvider = new TweetProvider();
    const summary = tweetProvider.getSummaryById(params.id);
    
    if (!summary) {
      return new Response('Summary not found', { status: 404 });
    }

    // Load the base image and font
    const [image, font] = await Promise.all([
      Jimp.read(process.cwd() + '/public/meta_promo.png'),
      loadFont(SANS_32_BLACK)
    ]);

    // Add text to image
    image.print({
      text: {
        text: summary + '.',
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE
      },
      x: 350,
      y: 200,
      maxWidth: 600,
      font
    });

    // Convert to buffer
    const buffer = await image.getBuffer("image/png");
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 