#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Data Cleanup Utility for Database Integrity Issues
 * 
 * Fixes duplicate tweet IDs and orphaned records found in Phase 1 analysis
 * Part of Phase 5 enhanced pipeline implementation
 */

import { 
  validateCrossFileConsistency, 
  safeReadDatabase, 
  safeWriteDatabase, 
  atomicMultiWrite,
  cleanupOldBackups,
  type ConsistencyIssue 
} from './atomic-db-operations.ts';
import { createDenoLogger } from '../../infrastructure/logger.ts';
import type { 
  Tweet, 
  TweetEnriched, 
  TweetSummary, 
  TweetMap, 
  TweetExam, 
  Book, 
  BookNotEnriched 
} from '../../infrastructure/schemas/database-schemas.ts';

const logger = createDenoLogger('data-cleanup');

export interface CleanupResult {
  success: boolean;
  issues: ConsistencyIssue[];
  fixedIssues: number;
  remainingIssues: number;
  backupPaths: string[];
}

/**
 * Remove duplicate tweet IDs from tweets.json
 */
function removeDuplicateTweets(data: Tweet[][]): Tweet[][] {
  const seenIds = new Set<string>();
  const cleanedData: Tweet[][] = [];
  let duplicatesRemoved = 0;

  for (const thread of data) {
    const cleanedThread: Tweet[] = [];
    
    for (const tweet of thread) {
      if (!seenIds.has(tweet.id)) {
        seenIds.add(tweet.id);
        cleanedThread.push(tweet);
      } else {
        duplicatesRemoved++;
        logger.warn(`Removed duplicate tweet ID: ${tweet.id}`);
      }
    }
    
    if (cleanedThread.length > 0) {
      cleanedData.push(cleanedThread);
    }
  }

  logger.info(`Removed ${duplicatesRemoved} duplicate tweets`);
  return cleanedData;
}

/**
 * Remove orphaned records from enriched databases
 */
function removeOrphanedRecords<T extends { id: string }>(
  data: T[], 
  validIds: Set<string>, 
  fileName: string
): T[] {
  const cleanedData = data.filter(record => {
    if (validIds.has(record.id)) {
      return true;
    } else {
      logger.warn(`Removed orphaned record from ${fileName}: ${record.id}`);
      return false;
    }
  });

  const removedCount = data.length - cleanedData.length;
  if (removedCount > 0) {
    logger.info(`Removed ${removedCount} orphaned records from ${fileName}`);
  }

  return cleanedData;
}

/**
 * Remove orphaned book records (books reference tweets via turraId)
 */
function removeOrphanedBooks<T extends { id: string; turraId: string }>(
  data: T[], 
  validIds: Set<string>, 
  fileName: string
): T[] {
  const cleanedData = data.filter(record => {
    if (validIds.has(record.turraId)) {
      return true;
    } else {
      logger.warn(`Removed orphaned book from ${fileName}: ${record.id} (turraId: ${record.turraId})`);
      return false;
    }
  });

  const removedCount = data.length - cleanedData.length;
  if (removedCount > 0) {
    logger.info(`Removed ${removedCount} orphaned book records from ${fileName}`);
  }

  return cleanedData;
}

/**
 * Main cleanup function
 */
export async function cleanupDatabaseIntegrity(dryRun: boolean = false): Promise<CleanupResult> {
  logger.info(`🧹 Starting database integrity cleanup ${dryRun ? '(DRY RUN)' : ''}`);
  
  try {
    // First, validate current state
    const initialIssues = validateCrossFileConsistency();
    logger.info(`Found ${initialIssues.length} consistency issues to fix`);
    
    if (initialIssues.length === 0) {
      return {
        success: true,
        issues: [],
        fixedIssues: 0,
        remainingIssues: 0,
        backupPaths: []
      };
    }

    // Read all database files
    const tweetsResult = safeReadDatabase<Tweet[][]>('tweets.json');
    if (!tweetsResult.success) {
      throw new Error(`Failed to read tweets.json: ${tweetsResult.error}`);
    }

    const enrichedResult = safeReadDatabase<TweetEnriched[]>('tweets_enriched.json');
    const summaryResult = safeReadDatabase<TweetSummary[]>('tweets_summary.json');
    const mapResult = safeReadDatabase<TweetMap[]>('tweets_map.json');
    const examResult = safeReadDatabase<TweetExam[]>('tweets_exam.json');
    const booksResult = safeReadDatabase<Book[]>('books.json');
    const booksNotEnrichedResult = safeReadDatabase<BookNotEnriched[]>('books-not-enriched.json');

    // Step 1: Clean duplicate tweets from tweets.json
    logger.info("🔍 Cleaning duplicate tweets from tweets.json");
    const cleanedTweets = removeDuplicateTweets(tweetsResult.data!);
    
    // Build set of valid tweet IDs after deduplication
    const validTweetIds = new Set<string>();
    for (const thread of cleanedTweets) {
      for (const tweet of thread) {
        validTweetIds.add(tweet.id);
      }
    }

    // Step 2: Clean orphaned records from all related databases
    const operations: Array<{
      fileName: any;
      data: any;
      skipValidation?: boolean;
    }> = [];

    // Always update tweets.json
    operations.push({
      fileName: 'tweets.json',
      data: cleanedTweets
    });

    // Clean enriched tweets
    if (enrichedResult.success) {
      logger.info("🔍 Cleaning orphaned enriched tweets");
      const cleanedEnriched = removeOrphanedRecords(
        enrichedResult.data!, 
        validTweetIds, 
        'tweets_enriched.json'
      );
      operations.push({
        fileName: 'tweets_enriched.json',
        data: cleanedEnriched
      });
    }

    // Clean summaries
    if (summaryResult.success) {
      logger.info("🔍 Cleaning orphaned summaries");
      const cleanedSummary = removeOrphanedRecords(
        summaryResult.data!, 
        validTweetIds, 
        'tweets_summary.json'
      );
      operations.push({
        fileName: 'tweets_summary.json',
        data: cleanedSummary
      });
    }

    // Clean maps
    if (mapResult.success) {
      logger.info("🔍 Cleaning orphaned maps");
      const cleanedMap = removeOrphanedRecords(
        mapResult.data!, 
        validTweetIds, 
        'tweets_map.json'
      );
      operations.push({
        fileName: 'tweets_map.json',
        data: cleanedMap
      });
    }

    // Clean exams
    if (examResult.success) {
      logger.info("🔍 Cleaning orphaned exams");
      const cleanedExam = removeOrphanedRecords(
        examResult.data!, 
        validTweetIds, 
        'tweets_exam.json'
      );
      operations.push({
        fileName: 'tweets_exam.json',
        data: cleanedExam
      });
    }

    // Clean books
    if (booksResult.success) {
      logger.info("🔍 Cleaning orphaned books");
      const cleanedBooks = removeOrphanedBooks(
        booksResult.data!, 
        validTweetIds, 
        'books.json'
      );
      operations.push({
        fileName: 'books.json',
        data: cleanedBooks
      });
    }

    // Clean books-not-enriched
    if (booksNotEnrichedResult.success) {
      logger.info("🔍 Cleaning orphaned books-not-enriched");
      const cleanedBooksNotEnriched = removeOrphanedBooks(
        booksNotEnrichedResult.data!, 
        validTweetIds, 
        'books-not-enriched.json'
      );
      operations.push({
        fileName: 'books-not-enriched.json',
        data: cleanedBooksNotEnriched
      });
    }

    if (dryRun) {
      logger.info(`🔍 DRY RUN: Would update ${operations.length} database files`);
      return {
        success: true,
        issues: initialIssues,
        fixedIssues: initialIssues.length,
        remainingIssues: 0,
        backupPaths: []
      };
    }

    // Perform atomic multi-write
    logger.info(`💾 Performing atomic write of ${operations.length} files`);
    const writeResult = atomicMultiWrite(operations);
    
    if (!writeResult.success) {
      throw new Error(`Atomic write failed: ${writeResult.error}`);
    }

    // Validate post-cleanup state
    const finalIssues = validateCrossFileConsistency();
    const fixedIssues = initialIssues.length - finalIssues.length;

    logger.info(`✅ Cleanup completed: ${fixedIssues} issues fixed, ${finalIssues.length} remaining`);

    // Clean up old backups
    cleanupOldBackups(24);

    return {
      success: true,
      issues: initialIssues,
      fixedIssues,
      remainingIssues: finalIssues.length,
      backupPaths: writeResult.data?.backups.map(b => b.backupPath) || []
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Cleanup failed: ${errorMessage}`);
    
    return {
      success: false,
      issues: [],
      fixedIssues: 0,
      remainingIssues: 0,
      backupPaths: [],
    };
  }
}

/**
 * CLI interface
 */
if (import.meta.main) {
  const args = Deno.args;
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧹 Database Integrity Cleanup Tool

Usage: deno run --allow-all scripts/lib/data-cleanup.ts [options]

Options:
  --dry-run, -n    Show what would be cleaned without making changes
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

Examples:
  deno run --allow-all scripts/lib/data-cleanup.ts --dry-run
  deno run --allow-all scripts/lib/data-cleanup.ts --verbose
`);
    Deno.exit(0);
  }

  const result = await cleanupDatabaseIntegrity(dryRun);
  
  if (verbose) {
    console.log('\n📊 Cleanup Results:');
    console.log(`  • Success: ${result.success}`);
    console.log(`  • Issues Fixed: ${result.fixedIssues}`);
    console.log(`  • Remaining Issues: ${result.remainingIssues}`);
    console.log(`  • Backup Files: ${result.backupPaths.length}`);
    
    if (result.backupPaths.length > 0) {
      console.log('\n💾 Backup Files Created:');
      for (const path of result.backupPaths) {
        console.log(`  • ${path}`);
      }
    }
  }

  if (!result.success) {
    Deno.exit(1);
  }
}