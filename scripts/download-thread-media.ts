#!/usr/bin/env -S deno run --allow-all

/**
 * Download Thread Media Script
 * 
 * Downloads images and videos from a Twitter thread using twitter-downloader
 * and saves them to the metadata directory.
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { createDenoLogger } from "../infrastructure/logger.ts";
import { createDataAccess } from "./libs/data-access.ts";

const logger = createDenoLogger('thread-media-downloader');

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  tweetId: string;
  filename: string;
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
      // Check for images in metadata.imgs
      if (tweet.metadata?.imgs && Array.isArray(tweet.metadata.imgs)) {
        for (let i = 0; i < tweet.metadata.imgs.length; i++) {
          const img = tweet.metadata.imgs[i];
          if (img.src) {
            const extension = getFileExtension(img.src, 'image');
            const filename = `${tweet.id}_img_${i + 1}${extension}`;
            
            mediaItems.push({
              url: img.src,
              type: 'image',
              tweetId: tweet.id,
              filename: filename
            });
          }
        }
      }
      
      // Check for other media structures
      if (tweet.media && Array.isArray(tweet.media)) {
        for (const media of tweet.media) {
          if (media.url) {
            const mediaType = media.type || (media.url.includes('.mp4') ? 'video' : 'image');
            const extension = getFileExtension(media.url, mediaType);
            const filename = `${tweet.id}_${media.url.split('/').pop()?.split('?')[0] || 'media'}${extension}`;
            
            mediaItems.push({
              url: media.url,
              type: mediaType,
              tweetId: tweet.id,
              filename: filename
            });
          }
        }
      }
      
      // Also check for photos array (alternative structure)
      if (tweet.photos && Array.isArray(tweet.photos)) {
        for (let i = 0; i < tweet.photos.length; i++) {
          const photo = tweet.photos[i];
          if (photo.url) {
            const filename = `${tweet.id}_photo_${i + 1}.jpg`;
            mediaItems.push({
              url: photo.url,
              type: 'image',
              tweetId: tweet.id,
              filename: filename
            });
          }
        }
      }
    }
    
    if (mediaItems.length === 0) {
      logger.info('No media found in thread tweets');
      return;
    }
    
    logger.info(`Found ${mediaItems.length} media items to download`);
    
    // Create metadata directory
    const metadataDir = join(scriptDir, "metadata");
    await ensureDir(metadataDir);
    
    // Download media items
    let downloaded = 0;
    let failed = 0;
    
    for (const item of mediaItems) {
      try {
        await downloadMediaItem(item, metadataDir);
        downloaded++;
        logger.info(`✓ Downloaded: ${item.filename}`);
      } catch (error) {
        failed++;
        logger.error(`✗ Failed to download ${item.filename}: ${error}`);
      }
    }
    
    logger.info(`Media download completed: ${downloaded} successful, ${failed} failed`);
    
  } catch (error) {
    logger.error(`Failed to download thread media: ${error}`);
    throw error;
  }
}

async function downloadMediaItem(item: MediaItem, targetDir: string): Promise<void> {
  const targetPath = join(targetDir, item.filename);
  
  // Download the media file
  const response = await fetch(item.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  await Deno.writeFile(targetPath, new Uint8Array(arrayBuffer));
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