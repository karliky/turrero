import { NextRequest } from 'next/server';
import { TweetProvider } from '../../../../infrastructure/TweetProvider';
import { createCanvas, loadImage } from 'canvas';

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  
  // Calculate lines
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Calculate vertical offset for centering
  const totalHeight = lines.length * lineHeight;
  const yOffsetStart = y - totalHeight / 2;

  // Draw lines
  lines.forEach((line, index) => {
    ctx.fillText(line, x, yOffsetStart + index * lineHeight);
  });
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const canvas = createCanvas(972, 547);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

    if (!id) {
      return new Response('ID not found', { status: 404 });
    }

    // Get the tweet summary
    const tweetProvider = new TweetProvider();
    const summary = tweetProvider.getSummaryById(id);
    
    if (!summary) {
      return new Response('Summary not found', { status: 404 });
    }

    const image = await loadImage('https://turrero.vercel.app/meta_promo.png');
    ctx.drawImage(image as unknown as CanvasImageSource, 0, 0);

    // Add text to image
    ctx.font = '32px Open Sans';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    wrapText(ctx, summary, 650, 273, 600, 40);

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    return new Response(buffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image ' + error, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 