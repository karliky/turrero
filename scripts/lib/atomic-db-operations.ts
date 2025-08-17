import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, dirname as _dirname, basename as _basename } from 'node:path';
import { 
  DATABASE_VALIDATORS, 
  DatabaseFileName,
  type Tweet,
  type TweetEnriched,
  type TweetSummary,
  type TweetMap,
  type TweetExam,
  type Book,
  type BookNotEnriched
} from '../../infrastructure/schemas/database-schemas.ts';

// Database file paths configuration  
const getDbBasePath = () => {
  const cwd = Deno.cwd();
  // If running from scripts directory, go up one level
  const projectRoot = cwd.endsWith('/scripts') ? join(cwd, '..') : cwd;
  return join(projectRoot, 'infrastructure', 'db');
};
const DB_BASE_PATH = getDbBasePath();
const BACKUP_EXTENSION = '.backup';

export interface AtomicOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  backupPath?: string;
}

export interface DatabaseBackupInfo {
  fileName: string;
  backupPath: string;
  timestamp: number;
}

/**
 * Creates a backup of a database file with timestamp
 */
function createBackup(filePath: string): string {
  const timestamp = Date.now();
  const backupPath = `${filePath}${BACKUP_EXTENSION}.${timestamp}`;
  
  if (existsSync(filePath)) {
    copyFileSync(filePath, backupPath);
  }
  
  return backupPath;
}

/**
 * Restores a database file from backup
 */
function restoreFromBackup(filePath: string, backupPath: string): boolean {
  try {
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to restore from backup: ${error}`);
    return false;
  }
}

/**
 * Cleans up backup files older than specified age
 */
export function cleanupOldBackups(maxAgeHours: number = 24): void {
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
  const now = Date.now();
  
  try {
    for (const dirEntry of Deno.readDirSync(DB_BASE_PATH)) {
      if (dirEntry.isFile && dirEntry.name.includes(BACKUP_EXTENSION)) {
        const filePath = join(DB_BASE_PATH, dirEntry.name);
        const stats = Deno.statSync(filePath);
        
        if (now - stats.mtime!.getTime() > maxAge) {
          unlinkSync(filePath);
          console.log(`Cleaned up old backup: ${dirEntry.name}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to cleanup old backups: ${error}`);
  }
}

/**
 * Generic safe read operation with validation
 */
export function safeReadDatabase<T>(fileName: DatabaseFileName): AtomicOperationResult<T> {
  const filePath = join(DB_BASE_PATH, fileName);
  
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Database file does not exist: ${fileName}`
      };
    }
    
    const rawData = readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    // Validate against schema
    const validator = DATABASE_VALIDATORS[fileName];
    const validatedData = validator(jsonData) as T;
    
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read ${fileName}: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generic safe write operation with backup and validation
 */
export function safeWriteDatabase<T>(
  fileName: DatabaseFileName, 
  data: T,
  skipValidation: boolean = false
): AtomicOperationResult<T> {
  const filePath = join(DB_BASE_PATH, fileName);
  let backupPath: string | undefined;
  
  try {
    // Create backup if file exists
    if (existsSync(filePath)) {
      backupPath = createBackup(filePath);
    }
    
    // Validate data against schema unless skipped
    if (!skipValidation) {
      const validator = DATABASE_VALIDATORS[fileName];
      validator(data); // Throws if invalid
    }
    
    // Write data
    const jsonString = JSON.stringify(data, null, 2);
    writeFileSync(filePath, jsonString, 'utf-8');
    
    return {
      success: true,
      data,
      backupPath
    };
  } catch (error) {
    // Restore from backup if write failed
    if (backupPath && existsSync(backupPath)) {
      restoreFromBackup(filePath, backupPath);
    }
    
    return {
      success: false,
      error: `Failed to write ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      backupPath
    };
  }
}

/**
 * Performs multiple database operations atomically
 * If any operation fails, all operations are rolled back
 */
export function atomicMultiWrite(
  operations: Array<{
    fileName: DatabaseFileName;
    data: Tweet[] | TweetEnriched[] | TweetSummary | TweetMap | TweetExam | Book[] | BookNotEnriched[];
    skipValidation?: boolean;
  }>
): AtomicOperationResult<{ backups: DatabaseBackupInfo[] }> {
  const backups: DatabaseBackupInfo[] = [];
  const completedOperations: string[] = [];
  
  try {
    // Create backups for all files first
    for (const op of operations) {
      const filePath = join(DB_BASE_PATH, op.fileName);
      if (existsSync(filePath)) {
        const backupPath = createBackup(filePath);
        backups.push({
          fileName: op.fileName,
          backupPath,
          timestamp: Date.now()
        });
      }
    }
    
    // Perform all operations
    for (const op of operations) {
      const result = safeWriteDatabase(op.fileName, op.data, op.skipValidation);
      if (!result.success) {
        throw new Error(`Operation failed for ${op.fileName}: ${result.error}`);
      }
      completedOperations.push(op.fileName);
    }
    
    return {
      success: true,
      data: { backups }
    };
  } catch (error) {
    // Rollback all completed operations
    console.error('Atomic operation failed, rolling back...');
    
    for (const backup of backups) {
      const filePath = join(DB_BASE_PATH, backup.fileName);
      restoreFromBackup(filePath, backup.backupPath);
    }
    
    return {
      success: false,
      error: `Atomic operation failed: ${error instanceof Error ? error.message : String(error)}`,
      data: { backups }
    };
  }
}

/**
 * Cross-file consistency validator
 */
export interface ConsistencyIssue {
  type: 'missing_reference' | 'orphaned_record' | 'duplicate_id' | 'invalid_reference';
  severity: 'error' | 'warning';
  message: string;
  fileName: string;
  recordId?: string;
}

export function validateCrossFileConsistency(): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  
  try {
    // Read all database files
    const tweetsResult = safeReadDatabase<Tweet[][]>('tweets.json');
    const enrichedResult = safeReadDatabase<TweetEnriched>('tweets_enriched.json');
    const summaryResult = safeReadDatabase<TweetSummary>('tweets_summary.json');
    const mapResult = safeReadDatabase<TweetMap>('tweets_map.json');
    const examResult = safeReadDatabase<TweetExam>('tweets_exam.json');
    const booksResult = safeReadDatabase<Book>('books.json');
    const booksNotEnrichedResult = safeReadDatabase<BookNotEnriched>('books-not-enriched.json');
    
    // Check if core files loaded successfully
    if (!tweetsResult.success) {
      issues.push({
        type: 'invalid_reference',
        severity: 'error',
        message: `Failed to load tweets.json: ${tweetsResult.error}`,
        fileName: 'tweets.json'
      });
      return issues; // Can't continue without tweets
    }
    
    // Extract all tweet IDs from tweets.json
    const tweetIds = new Set<string>();
    const duplicateIds = new Set<string>();
    
    for (const thread of tweetsResult.data!) {
      for (const tweet of thread) {
        if (tweetIds.has(tweet.id)) {
          duplicateIds.add(tweet.id);
        }
        tweetIds.add(tweet.id);
      }
    }
    
    // Report duplicate IDs in tweets.json
    for (const duplicateId of duplicateIds) {
      issues.push({
        type: 'duplicate_id',
        severity: 'error',
        message: `Duplicate tweet ID found: ${duplicateId}`,
        fileName: 'tweets.json',
        recordId: duplicateId
      });
    }
    
    // Check enriched tweets consistency
    if (enrichedResult.success) {
      for (const enrichedTweet of enrichedResult.data!) {
        if (!tweetIds.has(enrichedTweet.id)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'error',
            message: `Enriched tweet has no corresponding base tweet: ${enrichedTweet.id}`,
            fileName: 'tweets_enriched.json',
            recordId: enrichedTweet.id
          });
        }
      }
    }
    
    // Check summary consistency
    if (summaryResult.success) {
      for (const summary of summaryResult.data!) {
        if (!tweetIds.has(summary.id)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'warning',
            message: `Summary references non-existent tweet: ${summary.id}`,
            fileName: 'tweets_summary.json',
            recordId: summary.id
          });
        }
      }
    }
    
    // Check map consistency
    if (mapResult.success) {
      for (const map of mapResult.data!) {
        if (!tweetIds.has(map.id)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'warning',
            message: `Map references non-existent tweet: ${map.id}`,
            fileName: 'tweets_map.json',
            recordId: map.id
          });
        }
      }
    }
    
    // Check exam consistency
    if (examResult.success) {
      for (const exam of examResult.data!) {
        if (!tweetIds.has(exam.id)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'warning',
            message: `Exam references non-existent tweet: ${exam.id}`,
            fileName: 'tweets_exam.json',
            recordId: exam.id
          });
        }
      }
    }
    
    // Check books consistency
    if (booksResult.success) {
      for (const book of booksResult.data!) {
        if (!tweetIds.has(book.turraId)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'warning',
            message: `Book references non-existent tweet: ${book.turraId}`,
            fileName: 'books.json',
            recordId: book.id
          });
        }
      }
    }
    
    // Check books-not-enriched consistency
    if (booksNotEnrichedResult.success) {
      for (const book of booksNotEnrichedResult.data!) {
        if (!tweetIds.has(book.turraId)) {
          issues.push({
            type: 'orphaned_record',
            severity: 'warning',
            message: `Book (not enriched) references non-existent tweet: ${book.turraId}`,
            fileName: 'books-not-enriched.json',
            recordId: book.id
          });
        }
      }
    }
    
  } catch (error) {
    issues.push({
      type: 'invalid_reference',
      severity: 'error',
      message: `Cross-file validation failed: ${error instanceof Error ? error.message : String(error)}`,
      fileName: 'system'
    });
  }
  
  return issues;
}

/**
 * Utility function to get all tweet IDs from the database
 */
export function getAllTweetIds(): string[] {
  const result = safeReadDatabase<Tweet[][]>('tweets.json');
  if (!result.success || !result.data) {
    return [];
  }
  
  const ids: string[] = [];
  for (const thread of result.data) {
    for (const tweet of thread) {
      ids.push(tweet.id);
    }
  }
  
  return ids;
}

/**
 * Utility function to check if a tweet ID exists
 */
export function tweetExists(tweetId: string): boolean {
  const result = safeReadDatabase<Tweet[][]>('tweets.json');
  if (!result.success || !result.data) {
    return false;
  }
  
  for (const thread of result.data) {
    for (const tweet of thread) {
      if (tweet.id === tweetId) {
        return true;
      }
    }
  }
  
  return false;
}