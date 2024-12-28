import fs from "fs";
import path from "path";

export interface CategorizedTweet {
  id: string;
  categories: string;
}

export interface Tweet {
  tweet: string;
  id: string;
  time: string;
  metadata?: {
    embed?: {
      type: string;
      id: string;
      author: string;
      tweet: string;
    },
    type?: string;
    imgs?: {
      img: string;
      url: string;
    }[],
    img?: string;
    url?: string;
  };
  stats: {
    views: string;
    retweets: string;
    quotetweets: string;
    likes: string;
  };
}

export interface TweetSummary {
  id: string;
  summary: string;
}

export interface EnrichedTweetMetadata {
  id: string;
  type: 'card' | 'embed' | 'media';
  img?: string;
  url?: string;
  media?: string;
  description?: string;
  title?: string;
  embeddedTweetId?: string;
  author?: string;
  tweet?: string;
}

export interface TweetExam {
  id: string;
  questions: {
    question: string;
    options: string[];
    answer: number;
  }[];
}

export class TweetProvider {
  private tweetsMap: CategorizedTweet[];
  private tweets: Tweet[][];
  private tweetSummaries: TweetSummary[];
  private enrichedTweets: EnrichedTweetMetadata[];
  private tweetExams: TweetExam[];

  constructor() {
    this.tweetsMap = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/tweets_map.json'), 'utf-8'));
    this.tweets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/tweets.json'), 'utf-8'));
    this.tweetSummaries = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/tweets_summary.json'), 'utf-8'));
    this.enrichedTweets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/tweets_enriched.json'), 'utf-8'));
    this.tweetExams = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'infrastructure/db/tweets_exam.json'), 'utf-8'));
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

  getTop25Tweets(): Tweet[] {
    // Get first tweet from each thread and calculate engagement
    const topTweets = this.tweets
      .map(thread => thread[0]) // Get first tweet of each thread
      .map(tweet => ({
        ...tweet,
        engagement: this.calculateEngagement(tweet.stats)
      }))
      .sort((a, b) => (b.engagement || 0) - (a.engagement || 0)) // Sort by engagement
      .slice(0, 25); // Get top 25

    return topTweets;
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
}
 