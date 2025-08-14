import tweetsMapData from './db/tweets_map.json';
import tweetsData from './db/tweets.json';
import tweetSummariesData from './db/tweets_summary.json';
import enrichedTweetsData from './db/tweets_enriched.json';
import tweetExamsData from './db/tweets_exam.json';
import tweetPodcastsData from './db/tweets_podcast.json';
import graphData from './db/processed_graph_data.json';
import { Author } from './constants';
import {
  CategorizedTweet,
  Tweet,
  TweetSummary,
  EnrichedTweetMetadata,
  TweetExam,
  TurraNode,
  TweetWithEngagement,
  PodcastEpisode,
  ThreadId,
  TweetId,
  normalizeId,
  extractThreadId,
  createCompositeId
} from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-const
let instance: TweetProvider | null = null;

export class TweetProvider {
  private tweetsMap!: CategorizedTweet[];
  private tweets!: Tweet[][];
  private tweetSummaries!: TweetSummary[];
  private enrichedTweets!: EnrichedTweetMetadata[];
  private tweetExams!: TweetExam[];
  private tweetPodcasts!: PodcastEpisode[];
  private graphData!: TurraNode[];
  static instance: TweetProvider | null = null;

  constructor() {
    if (TweetProvider.instance) {
      return TweetProvider.instance;
    }

    this.tweetsMap = tweetsMapData as CategorizedTweet[];
    this.tweets = tweetsData as Tweet[][];
    this.tweetSummaries = tweetSummariesData as TweetSummary[];
    this.enrichedTweets = enrichedTweetsData as EnrichedTweetMetadata[];
    this.tweetExams = tweetExamsData as TweetExam[];
    this.tweetPodcasts = tweetPodcastsData as PodcastEpisode[];
    this.graphData = graphData as TurraNode[];

    TweetProvider.instance = this;
  }

  getTweetsByCategory(category: string): Tweet[] {
    const matchingTweets = this.tweetsMap
      .filter(tweet => {
        const tweetCategories = tweet.categories.split(',').map(c => c.trim());
        return tweetCategories.includes(category);
      })
      .map(tweet => normalizeId(tweet.id));
    
    // Flatten the array of arrays and then filter
    const flatTweets = this.tweets.flat();
    const result = flatTweets.filter(tweet => {
      const normalizedTweetId = normalizeId(tweet.id);
      const threadId = extractThreadId(normalizedTweetId);
      return matchingTweets.includes(threadId);
    });
    
    return result;
  }

  public getAllTweets(): Tweet[][] {
    return this.tweets;
  }

  public getSummaryById(id: string): string {
    const normalizedId = normalizeId(id);
    const threadId = extractThreadId(normalizedId);
    const summary = this.tweetSummaries.find(s => normalizeId(s.id) === threadId);
    return summary?.summary || '';
  }

  public getCategoryById(id: string): string[] {
    const normalizedId = normalizeId(id);
    const threadId = extractThreadId(normalizedId);
    const tweet = this.tweetsMap.find(tweet => normalizeId(tweet.id) === threadId);
    return tweet?.categories.split(',').map(c => c.trim()).filter(c => c.length > 0) || [];
  }

  getTop25Tweets(): TweetWithEngagement[] {
    // Get first tweet from each thread and calculate engagement
    const topTweets = this.tweets
      .map(thread => thread[0]) // Get first tweet of each thread
      .filter((tweet): tweet is Tweet => tweet !== undefined)
      .map(tweet => ({
        ...tweet,
        engagement: this.calculateEngagement(tweet.stats)
      }))
      .sort((a, b) => (b.engagement || 0) - (a.engagement || 0)) // Sort by engagement
      .slice(0, 25); // Get top 25

    return topTweets;
  }

  get25newestTweets(): TweetWithEngagement[] {
    const newestTweets = this.tweets
      .map(thread => thread[0]) // Get first tweet of each thread
      .filter((tweet): tweet is Tweet => tweet !== undefined)
      .map(tweet => ({
        ...tweet,
        engagement: this.calculateEngagement(tweet.stats)
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 25);

    return newestTweets;
  }

  public filterTweetsByAuthor(author: Author): Tweet[] {
    return this.tweets
      .map(thread => thread[0]) // Get first tweet of each thread
      .filter((tweet): tweet is Tweet => tweet !== undefined && tweet.author === author.X);
  }

  public filterAvoidTweetsByAuthor(author: Author): Tweet[] {
    return this.tweets
      .map(thread => thread[0]) // Get first tweet of each thread
      .filter((tweet): tweet is Tweet => tweet !== undefined && tweet.author !== author.X);
  }

  private calculateEngagement(stats: Tweet['stats']): number {
    return Number(stats.retweets) + 
           Number(stats.quotetweets) + 
           Number(stats.likes);
  }

  public getEnrichedTweetData(id: string): EnrichedTweetMetadata | undefined {
    const normalizedId = normalizeId(id);
    return this.enrichedTweets.find(t => normalizeId(t.id) === normalizedId);
  }

  public getExamById(id: string): TweetExam | undefined {
    const normalizedId = normalizeId(id);
    const threadId = extractThreadId(normalizedId);
    return this.tweetExams.find(exam => normalizeId(exam.id) === threadId);
  }

  public hasPodcast(id: string): boolean {
    const normalizedId = normalizeId(id);
    const threadId = extractThreadId(normalizedId);
    return this.tweetPodcasts.some(podcast => normalizeId(podcast.id) === threadId);
  }

  public getGraphData(): TurraNode[] {
    return this.graphData;
  }

  /**
   * Gets a complete thread by thread ID or any tweet ID within the thread
   */
  public getThread(id: string): Tweet[] {
    const normalizedId = normalizeId(id);
    const threadId = extractThreadId(normalizedId);
    
    // Find the thread that contains the ID
    const thread = this.tweets.find(thread => 
      thread.some(tweet => {
        const tweetThreadId = extractThreadId(normalizeId(tweet.id));
        return tweetThreadId === threadId;
      })
    );
    
    return thread || [];
  }

  /**
   * Gets a specific tweet by its exact ID
   */
  public getTweetById(id: string): Tweet | undefined {
    const normalizedId = normalizeId(id);
    const flatTweets = this.tweets.flat();
    return flatTweets.find(tweet => normalizeId(tweet.id) === normalizedId);
  }
}
 