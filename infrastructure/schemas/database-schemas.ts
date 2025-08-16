import { z } from 'zod';

// Common schemas
const TwitterStatsSchema = z.object({
  views: z.string().optional(),
  retweets: z.string().optional(),
  quotetweets: z.string().optional(),
  likes: z.string().optional(),
}).optional();

const EmbeddedTweetSchema = z.object({
  type: z.literal('embed'),
  id: z.string(),
  author: z.string(),
  tweet: z.string(),
});

const TweetMetadataSchema = z.object({
  embed: EmbeddedTweetSchema.optional(),
});

// Main Tweet Schema (tweets.json)
// Structure: Array of arrays containing tweet objects
const TweetObjectSchema = z.object({
  tweet: z.string(),
  id: z.string(),
  metadata: TweetMetadataSchema.optional(),
  time: z.string(), // ISO date string
  stats: TwitterStatsSchema,
  author: z.string(), // URL format
});

export const TweetSchema = z.array(z.array(TweetObjectSchema));

// Enriched Tweet Schema (tweets_enriched.json)
// This file contains mixed data: enriched tweets and media cards
const TweetEnrichedObjectSchema = z.object({
  type: z.string(), // e.g., 'embed', 'tweet', 'card', etc.
  embeddedTweetId: z.string().optional(),
  id: z.string(),
  author: z.string().optional(), // Optional for card types
  tweet: z.string().optional(), // Optional for card types
  // Card-specific fields
  img: z.string().optional(),
  url: z.string().optional(),
  media: z.string().optional(),
  description: z.string().optional(),
  title: z.string().optional(),
});

export const TweetEnrichedSchema = z.array(TweetEnrichedObjectSchema);

// Tweet Summary Schema (tweets_summary.json)
const TweetSummaryObjectSchema = z.object({
  id: z.string(),
  summary: z.string(),
});

export const TweetSummarySchema = z.array(TweetSummaryObjectSchema);

// Tweet Map Schema (tweets_map.json)
const TweetMapObjectSchema = z.object({
  id: z.string(),
  categories: z.string(), // Comma-separated string
});

export const TweetMapSchema = z.array(TweetMapObjectSchema);

// Tweet Exam Schema (tweets_exam.json)
const ExamQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answer: z.number(), // Index of correct answer
});

const TweetExamObjectSchema = z.object({
  id: z.string(),
  questions: z.array(ExamQuestionSchema),
});

export const TweetExamSchema = z.array(TweetExamObjectSchema);

// Book Schema (books.json)
const BookObjectSchema = z.object({
  id: z.string(),
  type: z.string(), // e.g., 'card'
  img: z.string(), // File path
  url: z.string(), // External URL
  media: z.string(), // e.g., 'goodreads'
  title: z.string(),
  turraId: z.string(), // Reference to tweet ID
  categories: z.array(z.string()),
});

export const BookSchema = z.array(BookObjectSchema);

// Book Not Enriched Schema (books-not-enriched.json)
const BookNotEnrichedObjectSchema = z.object({
  id: z.string(),
  type: z.string(), // e.g., 'card'
  img: z.string(), // File path
  url: z.string(), // External URL
  media: z.string(), // e.g., 'goodreads'
  title: z.string(),
  turraId: z.string(), // Reference to tweet ID
});

export const BookNotEnrichedSchema = z.array(BookNotEnrichedObjectSchema);

// Type exports for TypeScript
export type Tweet = z.infer<typeof TweetSchema>;
export type TweetObject = z.infer<typeof TweetObjectSchema>;
export type TweetEnriched = z.infer<typeof TweetEnrichedSchema>;
export type TweetEnrichedObject = z.infer<typeof TweetEnrichedObjectSchema>;
export type TweetSummary = z.infer<typeof TweetSummarySchema>;
export type TweetSummaryObject = z.infer<typeof TweetSummaryObjectSchema>;
export type TweetMap = z.infer<typeof TweetMapSchema>;
export type TweetMapObject = z.infer<typeof TweetMapObjectSchema>;
export type TweetExam = z.infer<typeof TweetExamSchema>;
export type TweetExamObject = z.infer<typeof TweetExamObjectSchema>;
export type ExamQuestion = z.infer<typeof ExamQuestionSchema>;
export type Book = z.infer<typeof BookSchema>;
export type BookObject = z.infer<typeof BookObjectSchema>;
export type BookNotEnriched = z.infer<typeof BookNotEnrichedSchema>;
export type BookNotEnrichedObject = z.infer<typeof BookNotEnrichedObjectSchema>;

// Schema validation functions
export const validateTweets = (data: unknown): Tweet => TweetSchema.parse(data);
export const validateTweetsEnriched = (data: unknown): TweetEnriched => TweetEnrichedSchema.parse(data);
export const validateTweetsSummary = (data: unknown): TweetSummary => TweetSummarySchema.parse(data);
export const validateTweetsMap = (data: unknown): TweetMap => TweetMapSchema.parse(data);
export const validateTweetsExam = (data: unknown): TweetExam => TweetExamSchema.parse(data);
export const validateBooks = (data: unknown): Book => BookSchema.parse(data);
export const validateBooksNotEnriched = (data: unknown): BookNotEnriched => BookNotEnrichedSchema.parse(data);

// Schema map for dynamic validation
export const DATABASE_SCHEMAS = {
  'tweets.json': TweetSchema,
  'tweets_enriched.json': TweetEnrichedSchema,
  'tweets_summary.json': TweetSummarySchema,
  'tweets_map.json': TweetMapSchema,
  'tweets_exam.json': TweetExamSchema,
  'books.json': BookSchema,
  'books-not-enriched.json': BookNotEnrichedSchema,
} as const;

// Validation function map
export const DATABASE_VALIDATORS = {
  'tweets.json': validateTweets,
  'tweets_enriched.json': validateTweetsEnriched,
  'tweets_summary.json': validateTweetsSummary,
  'tweets_map.json': validateTweetsMap,
  'tweets_exam.json': validateTweetsExam,
  'books.json': validateBooks,
  'books-not-enriched.json': validateBooksNotEnriched,
} as const;

export type DatabaseFileName = keyof typeof DATABASE_SCHEMAS;