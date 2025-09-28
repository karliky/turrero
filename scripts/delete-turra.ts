#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Delete Turra Script
 * 
 * Safely deletes a turra thread and all its associated data:
 * - Removes thread from tweets.json
 * - Removes thread from tweets_enriched.json  
 * - Removes thread from tweets-db.json (Algolia)
 * - Removes thread from tweets_map.json
 * - Removes thread from processed_graph_data.json
 * - Removes associated media files from public/
 * 
 * Only deletes tweets that are not referenced by other turras
 * 
 * Usage: deno task delete-turra <thread_id>
 */

// Use Deno standard library function directly

interface Tweet {
  id: string;
  tweet: string;
  author: string;
  time: string;
  metadata?: any;
  stats?: any;
}

interface TweetMap {
  id: string;
  categories: string;
}

interface ProcessedGraphData {
  id: string;
  url: string;
  [key: string]: any;
}

interface AlgoliaRecord {
  objectID: string;
  turraId: string;
  [key: string]: any;
}

const DB_PATH = "./infrastructure/db";
const PUBLIC_PATH = "./public";

class TurraDeleter {
  private threadId: string;
  private threadsToDelete: string[] = [];
  private allThreads: Tweet[][] = [];
  private allEnrichedData: any[] = [];
  private allMapData: TweetMap[] = [];
  private allGraphData: ProcessedGraphData[] = [];
  private allAlgoliaData: AlgoliaRecord[] = [];
  private allSummaryData: any[] = [];

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  private async loadAllData(): Promise<void> {
    console.log("📖 Loading database files...");

    // Load tweets.json
    try {
      const tweetsPath = `${DB_PATH}/tweets.json`;
      const tweetsContent = await Deno.readTextFile(tweetsPath);
      this.allThreads = JSON.parse(tweetsContent);
      console.log(`   ✓ Loaded ${this.allThreads.length} threads from tweets.json`);
    } catch {
      console.log("   ⚠️  tweets.json not found");
    }

    // Load tweets_enriched.json
    try {
      const enrichedPath = `${DB_PATH}/tweets_enriched.json`;
      const enrichedContent = await Deno.readTextFile(enrichedPath);
      this.allEnrichedData = JSON.parse(enrichedContent);
      console.log(`   ✓ Loaded ${this.allEnrichedData.length} enriched records`);
    } catch {
      console.log("   ⚠️  tweets_enriched.json not found");
    }

    // Load tweets_map.json
    try {
      const mapPath = `${DB_PATH}/tweets_map.json`;
      const mapContent = await Deno.readTextFile(mapPath);
      this.allMapData = JSON.parse(mapContent);
      console.log(`   ✓ Loaded ${this.allMapData.length} map records`);
    } catch {
      console.log("   ⚠️  tweets_map.json not found");
    }

    // Load processed_graph_data.json
    try {
      const graphPath = `${DB_PATH}/processed_graph_data.json`;
      const graphContent = await Deno.readTextFile(graphPath);
      const graphData = JSON.parse(graphContent);
      this.allGraphData = graphData.nodes || [];
      console.log(`   ✓ Loaded ${this.allGraphData.length} graph nodes`);
    } catch {
      console.log("   ⚠️  processed_graph_data.json not found");
    }

    // Load tweets-db.json (Algolia)
    try {
      const algoliaPath = `${DB_PATH}/tweets-db.json`;
      const algoliaContent = await Deno.readTextFile(algoliaPath);
      this.allAlgoliaData = JSON.parse(algoliaContent);
      console.log(`   ✓ Loaded ${this.allAlgoliaData.length} Algolia records`);
    } catch {
      console.log("   ⚠️  tweets-db.json not found");
    }

    // Load tweets_summary.json
    try {
      const summaryPath = `${DB_PATH}/tweets_summary.json`;
      const summaryContent = await Deno.readTextFile(summaryPath);
      this.allSummaryData = JSON.parse(summaryContent);
      console.log(`   ✓ Loaded ${this.allSummaryData.length} summary records`);
    } catch {
      console.log("   ⚠️  tweets_summary.json not found");
    }
  }

  private findThreadIndex(): number {
    return this.allThreads.findIndex(thread => 
      thread.length > 0 && thread[0].id === this.threadId
    );
  }

  private getTweetIdsFromThread(threadIndex: number): string[] {
    if (threadIndex === -1) return [];
    return this.allThreads[threadIndex].map(tweet => tweet.id);
  }

  private checkForCrossReferences(tweetIds: string[]): string[] {
    const crossRefs: string[] = [];
    
    // Check if any tweets from this thread are embedded in other threads
    for (const thread of this.allThreads) {
      if (thread.length === 0) continue;
      
      const threadFirstId = thread[0].id;
      if (threadFirstId === this.threadId) continue; // Skip the thread we're deleting
      
      for (const tweet of thread) {
        if (tweet.metadata?.embed?.id && tweetIds.includes(tweet.metadata.embed.id)) {
          crossRefs.push(`Tweet ${tweet.metadata.embed.id} is embedded in thread ${threadFirstId} (tweet ${tweet.id})`);
        }
        
        // Check enriched data for embedded tweets
        if (tweet.metadata?.embeddedTweetId && tweetIds.includes(tweet.metadata.embeddedTweetId)) {
          crossRefs.push(`Tweet ${tweet.metadata.embeddedTweetId} is embedded in thread ${threadFirstId} (tweet ${tweet.id})`);
        }
      }
    }

    // Check enriched data for cross-references
    for (const enriched of this.allEnrichedData) {
      if (enriched.embeddedTweetId && tweetIds.includes(enriched.embeddedTweetId)) {
        crossRefs.push(`Tweet ${enriched.embeddedTweetId} is referenced in enriched data for ${enriched.id}`);
      }
    }

    return crossRefs;
  }

  private async deleteFromDatabase(): Promise<void> {
    console.log("🗑️  Removing thread from database files...");

    const threadIndex = this.findThreadIndex();
    if (threadIndex === -1) {
      console.log("   ⚠️  Thread not found in tweets.json");
      return;
    }

    // Remove from tweets.json
    this.allThreads.splice(threadIndex, 1);
    const tweetsPath = `${DB_PATH}/tweets.json`;
    await Deno.writeTextFile(tweetsPath, JSON.stringify(this.allThreads, null, 2));
    console.log("   ✓ Removed from tweets.json");

    // Remove from tweets_enriched.json
    this.allEnrichedData = this.allEnrichedData.filter(item => item.id !== this.threadId);
    const enrichedPath = `${DB_PATH}/tweets_enriched.json`;
    await Deno.writeTextFile(enrichedPath, JSON.stringify(this.allEnrichedData, null, 2));
    console.log("   ✓ Removed from tweets_enriched.json");

    // Remove from tweets_map.json
    this.allMapData = this.allMapData.filter(item => item.id !== this.threadId);
    const mapPath = `${DB_PATH}/tweets_map.json`;
    await Deno.writeTextFile(mapPath, JSON.stringify(this.allMapData, null, 2));
    console.log("   ✓ Removed from tweets_map.json");

    // Remove from processed_graph_data.json
    try {
      const graphPath = `${DB_PATH}/processed_graph_data.json`;
      const graphData = JSON.parse(await Deno.readTextFile(graphPath));
      if (Array.isArray(graphData)) {
        const filteredData = graphData.filter((node: any) => node.id !== this.threadId);
        await Deno.writeTextFile(graphPath, JSON.stringify(filteredData, null, 2));
        console.log("   ✓ Removed from processed_graph_data.json");
      } else if (graphData.nodes) {
        graphData.nodes = graphData.nodes.filter((node: any) => node.id !== this.threadId);
        await Deno.writeTextFile(graphPath, JSON.stringify(graphData, null, 2));
        console.log("   ✓ Removed from processed_graph_data.json");
      }
    } catch {
      console.log("   ⚠️  Could not update processed_graph_data.json");
    }

    // Remove from tweets_summary.json
    this.allSummaryData = this.allSummaryData.filter(item => item.id !== this.threadId);
    const summaryPath = `${DB_PATH}/tweets_summary.json`;
    await Deno.writeTextFile(summaryPath, JSON.stringify(this.allSummaryData, null, 2));
    console.log("   ✓ Removed from tweets_summary.json");

    // Remove from tweets-db.json (Algolia)
    this.allAlgoliaData = this.allAlgoliaData.filter(record => 
      !record.objectID.startsWith(`${this.threadId}#`)
    );
    const algoliaPath = `${DB_PATH}/tweets-db.json`;
    await Deno.writeTextFile(algoliaPath, JSON.stringify(this.allAlgoliaData, null, 2));
    console.log("   ✓ Removed from tweets-db.json");
  }

  private async deleteMediaFiles(): Promise<void> {
    console.log("🖼️  Searching for media files to delete...");

    let deletedCount = 0;
    
    // Search for files containing the thread ID
    try {
      const command = new Deno.Command("find", {
        args: [PUBLIC_PATH, "-name", `*${this.threadId}*`],
        stdout: "piped",
        stderr: "piped"
      });
      
      const { success, stdout } = await command.output();
      
      if (success) {
        const output = new TextDecoder().decode(stdout);
        const files = output.trim().split('\n').filter(f => f.length > 0);
        
        for (const file of files) {
          try {
            await Deno.remove(file);
            console.log(`   ✓ Deleted: ${file}`);
            deletedCount++;
          } catch (error) {
            console.log(`   ⚠️  Could not delete ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Error searching for media files: ${error.message}`);
    }

    if (deletedCount === 0) {
      console.log("   ℹ️  No media files found for this thread");
    } else {
      console.log(`   ✓ Deleted ${deletedCount} media files`);
    }
  }

  private async createBackups(): Promise<void> {
    console.log("💾 Creating backups...");
    
    const timestamp = new Date().getTime();
    const backupSuffix = `.backup.${timestamp}`;
    
    const files = [
      'tweets.json',
      'tweets_enriched.json', 
      'tweets_map.json',
      'processed_graph_data.json',
      'tweets-db.json',
      'tweets_summary.json'
    ];

    for (const file of files) {
      const originalPath = `${DB_PATH}/${file}`;
      const backupPath = `${DB_PATH}/${file}${backupSuffix}`;
      
      try {
        await Deno.stat(originalPath);
        await Deno.copyFile(originalPath, backupPath);
        console.log(`   ✓ Backed up ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Could not backup ${file}: ${error.message}`);
      }
    }
  }

  async execute(): Promise<void> {
    console.log(`🧹 Deleting turra thread: ${this.threadId}`);
    console.log("=" .repeat(50));

    // Load all data
    await this.loadAllData();

    // Find the thread
    const threadIndex = this.findThreadIndex();
    if (threadIndex === -1) {
      console.log("❌ Thread not found in database!");
      Deno.exit(1);
    }

    console.log("✅ Thread found in database");

    // Get all tweet IDs from this thread
    const tweetIds = this.getTweetIdsFromThread(threadIndex);
    console.log(`📊 Thread contains ${tweetIds.length} tweets`);

    // Check for cross-references
    console.log("🔍 Checking for cross-references...");
    const crossRefs = this.checkForCrossReferences(tweetIds);
    
    if (crossRefs.length > 0) {
      console.log("⚠️  WARNING: Found cross-references:");
      crossRefs.forEach(ref => console.log(`   • ${ref}`));
      console.log("\nThis thread cannot be safely deleted due to cross-references.");
      console.log("Please manually review these references before deletion.");
      Deno.exit(1);
    }

    console.log("✅ No cross-references found - safe to delete");

    // Create backups
    await this.createBackups();

    // Delete from database
    await this.deleteFromDatabase();

    // Delete media files
    await this.deleteMediaFiles();

    console.log("\n🎉 Thread deletion completed successfully!");
    console.log(`📝 Backups created with timestamp: ${new Date().getTime()}`);
    console.log("💡 Remember to run 'deno task algolia' to update the search index");
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  
  if (args.length !== 1) {
    console.log("Usage: deno task delete-turra <thread_id>");
    console.log("Example: deno task delete-turra 1938855177471021516");
    Deno.exit(1);
  }

  const threadId = args[0];
  
  if (!threadId.match(/^\d+$/)) {
    console.log("❌ Invalid thread ID format. Must be numeric.");
    Deno.exit(1);
  }

  const deleter = new TurraDeleter(threadId);
  await deleter.execute();
}