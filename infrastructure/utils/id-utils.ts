/**
 * ID Utilities for consistent ID handling across the Turrero project
 * Standardizes all ID formats to ensure consistency
 */

export type ThreadId = string;
export type TweetId = string;
export type CompositeId = string;

/**
 * Validates that an ID is a valid Twitter/X ID format
 */
export function isValidTwitterId(id: string): boolean {
  return /^[0-9]+$/.test(id) && id.length >= 10;
}

/**
 * Validates that a composite ID is in the correct format
 */
export function isValidCompositeId(id: string): boolean {
  const parts = id.split('#');
  if (parts.length !== 2) return false;
  const [threadId, tweetId] = parts;
  return !!(threadId && tweetId && isValidTwitterId(threadId) && isValidTwitterId(tweetId));
}

/**
 * Creates a composite ID from thread and tweet IDs
 */
export function createCompositeId(threadId: ThreadId, tweetId: TweetId): CompositeId {
  if (!isValidTwitterId(threadId) || !isValidTwitterId(tweetId)) {
    throw new Error(`Invalid ID format: threadId=${threadId}, tweetId=${tweetId}`);
  }
  return `${threadId}#${tweetId}`;
}

/**
 * Parses a composite ID into thread and tweet IDs
 */
export function parseCompositeId(compositeId: CompositeId): { threadId: ThreadId; tweetId: TweetId } {
  if (!isValidCompositeId(compositeId)) {
    throw new Error(`Invalid composite ID format: ${compositeId}`);
  }
  
  const parts = compositeId.split('#');
  if (parts.length !== 2) {
    throw new Error(`Invalid composite ID format: ${compositeId}`);
  }
  
  const [threadId, tweetId] = parts;
  if (!threadId || !tweetId) {
    throw new Error(`Invalid composite ID format: ${compositeId}`);
  }
  
  return { threadId, tweetId };
}

/**
 * Converts old format composite IDs (threadId-tweetId) to new format (threadId#tweetId)
 */
export function migrateOldCompositeId(oldId: string): CompositeId {
  // Handle old format with dash
  if (oldId.includes('-') && !oldId.includes('#')) {
    const parts = oldId.split('-');
    if (parts.length === 2) {
      const [threadId, tweetId] = parts;
      if (threadId && tweetId && isValidTwitterId(threadId) && isValidTwitterId(tweetId)) {
        return createCompositeId(threadId, tweetId);
      }
    }
  }
  
  // If already in new format or single ID, return as-is
  if (isValidCompositeId(oldId) || isValidTwitterId(oldId)) {
    return oldId;
  }
  
  throw new Error(`Cannot migrate ID format: ${oldId}`);
}

/**
 * Extracts thread ID from various ID formats
 */
export function extractThreadId(id: string): ThreadId {
  // Single thread ID
  if (isValidTwitterId(id)) {
    return id;
  }
  
  // Composite ID with #
  if (id.includes('#')) {
    const { threadId } = parseCompositeId(id);
    return threadId;
  }
  
  // Old format with dash
  if (id.includes('-')) {
    const migratedId = migrateOldCompositeId(id);
    return extractThreadId(migratedId);
  }
  
  throw new Error(`Cannot extract thread ID from: ${id}`);
}

/**
 * Extracts tweet ID from composite ID, returns undefined for thread-only IDs
 */
export function extractTweetId(id: string): TweetId | undefined {
  if (id.includes('#')) {
    const { tweetId } = parseCompositeId(id);
    return tweetId;
  }
  
  if (id.includes('-')) {
    const migratedId = migrateOldCompositeId(id);
    return extractTweetId(migratedId);
  }
  
  // Single thread ID - no tweet ID
  return undefined;
}

/**
 * Normalizes any ID format to the standard format
 */
export function normalizeId(id: string): string {
  try {
    // Try to migrate if it's an old format
    if (id.includes('-')) {
      return migrateOldCompositeId(id);
    }
    
    // Validate current format
    if (isValidTwitterId(id) || isValidCompositeId(id)) {
      return id;
    }
    
    throw new Error(`Invalid ID format: ${id}`);
  } catch (error) {
    console.warn(`Failed to normalize ID: ${id}`, error);
    return id; // Return original if normalization fails
  }
}

/**
 * Converts category string to array format
 */
export function normalizeCategoryFormat(categories: string | string[]): string[] {
  if (Array.isArray(categories)) {
    return categories;
  }
  
  if (typeof categories === 'string') {
    return categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
  }
  
  return [];
}

/**
 * Converts category array to string format (for backward compatibility)
 */
export function categoriesToString(categories: string[]): string {
  return categories.join(',');
}

/**
 * Type guards for ID validation
 */
export const IdValidators = {
  isThreadId: (id: string): id is ThreadId => isValidTwitterId(id),
  isTweetId: (id: string): id is TweetId => isValidTwitterId(id),
  isCompositeId: (id: string): id is CompositeId => isValidCompositeId(id),
} as const;