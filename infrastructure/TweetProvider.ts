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
  PodcastEpisode
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
      .map(tweet => tweet.id);
    
    // Flatten the array of arrays and then filter
    const flatTweets = this.tweets.flat();
    const result = flatTweets.filter(tweet => matchingTweets.includes(tweet.id));
    
    return result;
  }

  public getAllTweets(): Tweet[][] {
    return this.tweets;
  }

  public getSummaryById(id: string): string {
    const summary = this.tweetSummaries.find(s => s.id === id);
    return summary?.summary || '';
  }

  public getCategoryById(id: string): string[] {
    const tweet = this.tweetsMap.find(tweet => tweet.id === id);
    return tweet?.categories.split(',') || [];
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
    return this.enrichedTweets.find(t => t.id === id);
  }

  public getExamById(id: string): TweetExam | undefined {
    return this.tweetExams.find(exam => exam.id === id);
  }

  public hasPodcast(id: string): boolean {
    return this.tweetPodcasts.some(podcast => podcast.id === id);
  }

  public getGraphData(): TurraNode[] {
    return this.graphData;
  }
}
 