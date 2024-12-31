import { NextResponse } from 'next/server';
import { TweetProvider } from '../../../infrastructure/TweetProvider';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  const tweetProvider = new TweetProvider();
  const summary = tweetProvider.getSummaryById(query);

  return NextResponse.json({ summary });
} 