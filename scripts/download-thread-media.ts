#!/usr/bin/env -S deno run --allow-all

/**
 * Download Thread Media Script
 * 
 * Downloads images and videos from a Twitter thread and updates tweets_enriched.json
 * with correct paths to the downloaded media files.
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { createDenoLogger } from "../infrastructure/logger.ts";
import { createDataAccess } from "./libs/data-access.ts";
import type { EnrichedTweetData } from "../infrastructure/types/index.ts";

const logger = createDenoLogger('thread-media-downloader');

/**
 * Generate short hash (8 chars) compatible with existing filename system
 * Combines parts of SHA256 hash to maintain uniqueness while keeping compatibility
 */
function generateShortHash(fullHashHex: string): string {
  // Take first 4 chars + middle 2 + last 2 chars for better distribution
  // This maintains compatibility with existing short filenames like "-6ONSlnQ", "2Oog5v4a"
  const first4 = fullHashHex.substring(0, 4);
  const middle2 = fullHashHex.substring(16, 18);
  const last2 = fullHashHex.substring(62, 64);
  return first4 + middle2 + last2;
}

// Progress bar utilities
class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 50;
  private lastUpdate: number = 0;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(current: number, status?: string) {
    this.current = current;
    const now = Date.now();
    
    // Only update every 200ms to avoid flickering
    if (now - this.lastUpdate < 200 && current < this.total) return;
    this.lastUpdate = now;

    const percentage = Math.round((current / this.total) * 100);
    const filled = Math.round((current / this.total) * this.width);
    const empty = this.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const elapsed = (now - this.startTime) / 1000;
    const rate = current / elapsed;
    const eta = current > 0 ? Math.round((this.total - current) / rate) : 0;
    
    // Use simpler approach - just overwrite the line
    const statusText = status ? ` | ${status}` : '';
    const progressText = `📦 [${bar}] ${percentage}% (${current}/${this.total}) ETA: ${eta}s${statusText}`;
    
    // Clear line and write progress
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${' '.repeat(120)}\r${progressText}`));
    
    if (current >= this.total) {
      Deno.stdout.writeSync(new TextEncoder().encode('\n'));
    }
  }

  complete(summary?: string) {
    this.update(this.total);
    if (summary) {
      console.log(`✅ ${summary}`);
    }
  }

  fail(error: string) {
    process.stdout.write('\r\x1b[K');
    console.log(`❌ ${error}`);
  }
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  tweetId: string;
  filename: string; // Original filename (for logging)
  actualFilename?: string; // SHA256-based filename (set after download)
  tweetText: string;
}

async function downloadThreadMedia(threadId: string): Promise<void> {
  logger.info(`Starting media download for thread: ${threadId}`);
  
  const scriptDir = new URL(".", import.meta.url).pathname;
  const dataAccess = createDataAccess(scriptDir);
  
  try {
    // Get thread tweets from database
    const tweetsPath = join(scriptDir, "..", "infrastructure", "db", "tweets.json");
    const tweetsData = await Deno.readTextFile(tweetsPath);
    const threadsArray = JSON.parse(tweetsData);
    
    logger.debug(`Searching for tweet ID: ${threadId}`);
    logger.debug(`Total threads in database: ${threadsArray.length}`);
    
    // Find the thread that contains our tweet ID
    let threadTweets: any[] = [];
    let foundThread = false;
    
    for (const thread of threadsArray) {
      if (Array.isArray(thread)) {
        const hasTargetTweet = thread.some((tweet: any) => tweet.id === threadId);
        if (hasTargetTweet) {
          threadTweets = thread;
          foundThread = true;
          break;
        }
      }
    }
    
    if (!foundThread) {
      logger.warn(`Thread containing tweet ${threadId} not found`);
      return;
    }
    
    if (threadTweets.length === 0) {
      logger.warn(`No tweets found for thread: ${threadId}`);
      return;
    }
    
    logger.info(`Found ${threadTweets.length} tweets in thread`);
    
    // Extract media URLs from tweets
    const mediaItems: MediaItem[] = [];
    
    for (const tweet of threadTweets) {
      // Check for images in metadata.imgs (exclude profile/avatar images)
      if (tweet.metadata?.imgs && Array.isArray(tweet.metadata.imgs)) {
        let contentImageIndex = 1;
        let videoIndex = 1;
        
        for (const img of tweet.metadata.imgs) {
          if (img.src && !isProfileImage(img.src)) {
            // Determine if this is a video thumbnail based on URL patterns
            const isVideoThumb = img.src.includes('video_thumb') || 
                               img.src.includes('ext_tw_video_thumb') || 
                               img.src.includes('amplify_video_thumb') || 
                               img.src.includes('tweet_video_thumb') ||
                               tweet.metadata.type === 'video';
            
            const mediaType = isVideoThumb ? 'video' : 'image';
            const extension = getFileExtension(img.src, mediaType);
            
            let filename: string;
            if (isVideoThumb) {
              filename = `${tweet.id}_video_${videoIndex}${extension}`;
              videoIndex++;
            } else {
              filename = `${tweet.id}_img_${contentImageIndex}${extension}`;
              contentImageIndex++;
            }
            
            mediaItems.push({
              url: img.src,
              type: mediaType,
              tweetId: tweet.id,
              filename: filename,
              tweetText: tweet.tweet || ''
            });
          }
        }
      }
      
      // Check for other media structures
      if (tweet.media && Array.isArray(tweet.media)) {
        for (const media of tweet.media) {
          if (media.url && !isProfileImage(media.url)) {
            const mediaType = media.type || (media.url.includes('.mp4') ? 'video' : 'image');
            const extension = getFileExtension(media.url, mediaType);
            const filename = `${tweet.id}_${media.url.split('/').pop()?.split('?')[0] || 'media'}${extension}`;
            
            mediaItems.push({
              url: media.url,
              type: mediaType,
              tweetId: tweet.id,
              filename: filename,
              tweetText: tweet.tweet || ''
            });
          }
        }
      }
      
      // Also check for photos array (alternative structure)
      if (tweet.photos && Array.isArray(tweet.photos)) {
        for (let i = 0; i < tweet.photos.length; i++) {
          const photo = tweet.photos[i];
          if (photo.url && !isProfileImage(photo.url)) {
            const filename = `${tweet.id}_photo_${i + 1}.jpg`;
            mediaItems.push({
              url: photo.url,
              type: 'image',
              tweetId: tweet.id,
              filename: filename,
              tweetText: tweet.tweet || ''
            });
          }
        }
      }
    }
    
    if (mediaItems.length === 0) {
      logger.info('No media found in thread tweets');
      return;
    }
    
    logger.info(`Found ${mediaItems.length} media items to download (${mediaItems.filter(m => m.type === 'video').length} videos, ${mediaItems.filter(m => m.type === 'image').length} images)`);
    
    // Create public/metadata directory
    const publicMetadataDir = join(scriptDir, "..", "public", "metadata");
    await ensureDir(publicMetadataDir);
    
    // Download media items with progress bar
    const downloadedItems: MediaItem[] = [];
    let failed = 0;
    
    console.log('🚀 Starting download process...');
    const progressBar = new ProgressBar(mediaItems.length);
    
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      const itemType = item.type === 'video' ? '📹' : '🖼️';
      const statusText = `${itemType} ${item.filename.substring(0, 30)}${item.filename.length > 30 ? '...' : ''}`;
      
      try {
        await downloadMediaItem(item, publicMetadataDir, false);
        downloadedItems.push(item);
        progressBar.update(i + 1, statusText);
      } catch (error) {
        failed++;
        progressBar.update(i + 1, `❌ Failed: ${statusText}`);
      }
    }
    
    progressBar.complete(`Download completed: ${downloadedItems.length} successful, ${failed} failed`);
    
    // Update tweets_enriched.json with downloaded media
    if (downloadedItems.length > 0) {
      await updateTweetsEnriched(threadTweets, downloadedItems, dataAccess);
      logger.info(`✓ Updated tweets_enriched.json with ${downloadedItems.length} media entries`);
    }
    
  } catch (error) {
    logger.error(`Failed to download thread media: ${error}`);
    throw error;
  }
}

async function downloadMediaItem(item: MediaItem, targetDir: string, showProgress: boolean = false): Promise<void> {
  // Download the media file first to get its content
  const response = await fetch(item.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Calculate SHA256 hash of the content
  const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Array);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Generate short hash (8 chars) compatible with existing system
  const shortHash = generateShortHash(hashHex);
  
  // Get file extension from original filename
  const extension = item.filename.includes('.') ? item.filename.substring(item.filename.lastIndexOf('.')) : '.jpg';
  const sha256Filename = `${shortHash}${extension}`;
  const targetPath = join(targetDir, sha256Filename);
  
  // Check if file already exists with this hash
  try {
    await Deno.stat(targetPath);
    // File already exists, no need to write again
    if (showProgress) {
      logger.debug(`📋 File already exists: ${sha256Filename} (skipping download)`);
    }
    item.actualFilename = sha256Filename;
    return;
  } catch {
    // File doesn't exist, proceed with download
  }
  
  // Write the file with SHA256 name
  await Deno.writeFile(targetPath, uint8Array);
  item.actualFilename = sha256Filename;
  
  if (showProgress) {
    logger.debug(`💾 Saved as: ${sha256Filename} (${uint8Array.length} bytes)`);
  }
}

function isProfileImage(url: string): boolean {
  // Filter out profile/avatar images
  return url.includes('/profile_images/') || 
         url.includes('/profile_banners/') ||
         url.includes('_profile') ||
         url.includes('avatar');
}

function getFileExtension(url: string, mediaType: string): string {
  // Extract extension from URL
  const urlParts = url.split('?')[0].split('.');
  if (urlParts.length > 1) {
    const ext = urlParts[urlParts.length - 1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'].includes(ext)) {
      return `.${ext}`;
    }
  }
  
  // Fallback based on media type
  return mediaType === 'video' ? '.mp4' : '.jpg';
}

/**
 * Update tweets_enriched.json with downloaded media while preserving existing enrichments
 */
async function updateTweetsEnriched(
  threadTweets: any[], 
  downloadedItems: MediaItem[], 
  dataAccess: any
): Promise<void> {
  try {
    // Get existing enrichments
    const existingEnrichments: EnrichedTweetData[] = await dataAccess.getTweetsEnriched();
    
    // Get the thread ID from the first tweet
    const threadId = threadTweets[0]?.id;
    if (!threadId) return;
    
    // Remove existing image and video entries for this thread only (preserve other types)
    const preservedEnrichments = existingEnrichments.filter((entry: EnrichedTweetData) => {
      const isFromThisThread = threadTweets.some(tweet => tweet.id === entry.id);
      const isMediaType = ['image', 'video', 'card', 'media'].includes(entry.type);
      
      // Preserve if: not from this thread OR not a media type
      return !isFromThisThread || !isMediaType;
    });
    
    // Create new enrichment entries for downloaded media
    const newMediaEntries: EnrichedTweetData[] = downloadedItems.map((item: MediaItem) => ({
      id: item.tweetId,
      type: item.type === 'video' ? 'video' : 'image',
      media: item.type,
      title: "",
      description: item.tweetText.substring(0, 100),
      url: "",
      img: `/metadata/${item.actualFilename || item.filename}`
    }));
    
    // Combine preserved and new entries
    const updatedEnrichments = [...preservedEnrichments, ...newMediaEntries];
    
    // Save updated enrichments
    await dataAccess.saveTweetsEnriched(updatedEnrichments);
    
  } catch (error) {
    logger.error(`Failed to update tweets_enriched.json: ${error}`);
    throw error;
  }
}

// Main execution
async function main() {
  const threadId = Deno.args[0];
  
  if (!threadId) {
    logger.error('Thread ID is required');
    logger.info('Usage: deno run --allow-all download-thread-media.ts <thread_id>');
    Deno.exit(1);
  }
  
  try {
    await downloadThreadMedia(threadId);
    logger.info('✅ Media download completed successfully');
  } catch (error) {
    logger.error(`❌ Media download failed: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}