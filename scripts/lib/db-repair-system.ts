#!/usr/bin/env -S deno run --allow-all

import { existsSync, readFileSync, writeFileSync, unlinkSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { 
  safeReadDatabase, 
  safeWriteDatabase,
  atomicMultiWrite,
  type AtomicOperationResult 
} from './atomic-db-operations.ts';
import { 
  enhancedValidator,
  type EnhancedConsistencyIssue,
  type ValidationReport,
  type MetadataAsset
} from './enhanced-db-validator.ts';

/**
 * Interactive repair system for database issues
 */
export class DatabaseRepairSystem {
  private static instance: DatabaseRepairSystem;
  private report?: ValidationReport;

  static getInstance(): DatabaseRepairSystem {
    if (!DatabaseRepairSystem.instance) {
      DatabaseRepairSystem.instance = new DatabaseRepairSystem();
    }
    return DatabaseRepairSystem.instance;
  }

  /**
   * Run interactive repair process
   */
  async runInteractiveRepair(dryRun: boolean = false): Promise<void> {
    console.log('🔧 Starting interactive database repair system...\n');

    // Generate comprehensive validation report
    this.report = await enhancedValidator.runValidation();
    
    if (this.report.issues.length === 0) {
      console.log('✅ No issues found! Database is in excellent condition.');
      return;
    }

    console.log(`📊 Found ${this.report.issues.length} issues to address:`);
    this.printIssueSummary();

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      this.showRepairPlan();
      return;
    }

    // Interactive repair process
    await this.processRepairableIssues();
  }

  /**
   * Print summary of issues found
   */
  private printIssueSummary(): void {
    const issueTypes = new Map<string, number>();
    
    for (const issue of this.report!.issues) {
      issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
    }

    console.log('\n📋 Issue Summary:');
    for (const [type, count] of issueTypes.entries()) {
      console.log(`  • ${this.formatIssueType(type)}: ${count}`);
    }

    console.log(`\n🖼️  Metadata Analysis:`);
    console.log(`  • Total assets: ${this.report!.metadataAnalysis.totalAssets}`);
    console.log(`  • Orphaned assets: ${this.report!.metadataAnalysis.orphanedAssets}`);
    console.log(`  • Broken references: ${this.report!.metadataAnalysis.brokenReferences}`);

    console.log(`\n🔗 Turra Analysis:`);
    console.log(`  • Total turras: ${this.report!.turraAnalysis.totalTurras}`);
    console.log(`  • Missing turra entries: ${this.report!.turraAnalysis.missingTurras}`);
    console.log(`  • Orphaned turra entries: ${this.report!.turraAnalysis.orphanedTurras}`);
  }

  /**
   * Format issue type for display
   */
  private formatIssueType(type: string): string {
    const typeMap: Record<string, string> = {
      'unused_metadata': 'Unused metadata files',
      'missing_turra': 'Missing turra entries',
      'orphaned_turra': 'Orphaned turra entries',
      'broken_asset_reference': 'Broken asset references',
      'semantic_duplicate': 'Semantic duplicates',
      'duplicate_id': 'Duplicate IDs',
      'orphaned_record': 'Orphaned records',
      'missing_reference': 'Missing references',
      'invalid_reference': 'Invalid references'
    };
    return typeMap[type] || type;
  }

  /**
   * Show repair plan without executing
   */
  private showRepairPlan(): void {
    console.log('\n📋 Repair Plan:');
    
    const repairableIssues = this.report!.issues.filter(issue => 
      issue.metadata?.suggestedAction && 
      ['delete', 'repair'].includes(issue.metadata.suggestedAction)
    );

    if (repairableIssues.length === 0) {
      console.log('  No automatically repairable issues found.');
      return;
    }

    const groupedIssues = new Map<string, EnhancedConsistencyIssue[]>();
    for (const issue of repairableIssues) {
      const action = issue.metadata!.suggestedAction!;
      if (!groupedIssues.has(action)) {
        groupedIssues.set(action, []);
      }
      groupedIssues.get(action)!.push(issue);
    }

    for (const [action, issues] of groupedIssues.entries()) {
      console.log(`\n${this.getActionEmoji(action)} ${action.toUpperCase()} (${issues.length} items):`);
      for (const issue of issues.slice(0, 5)) { // Show first 5
        console.log(`    • ${issue.message}`);
      }
      if (issues.length > 5) {
        console.log(`    ... and ${issues.length - 5} more`);
      }
    }
  }

  /**
   * Get emoji for action type
   */
  private getActionEmoji(action: string): string {
    const emojiMap: Record<string, string> = {
      'delete': '🗑️',
      'repair': '🔧',
      'move': '📦',
      'rename': '✏️'
    };
    return emojiMap[action] || '⚡';
  }

  /**
   * Process repairable issues interactively
   */
  private async processRepairableIssues(): Promise<void> {
    console.log('\n🔧 Starting repair process...');

    // Group issues by repair type
    const orphanedAssets = this.report!.issues.filter(i => i.type === 'unused_metadata');
    const missingTurras = this.report!.issues.filter(i => i.type === 'missing_turra');
    const orphanedTurras = this.report!.issues.filter(i => i.type === 'orphaned_turra');

    // Process each repair type
    if (orphanedAssets.length > 0) {
      await this.repairOrphanedAssets(orphanedAssets);
    }

    if (missingTurras.length > 0) {
      await this.repairMissingTurras(missingTurras);
    }

    if (orphanedTurras.length > 0) {
      await this.repairOrphanedTurras(orphanedTurras);
    }

    console.log('\n✅ Repair process completed!');
  }

  /**
   * Repair orphaned metadata assets
   */
  private async repairOrphanedAssets(issues: EnhancedConsistencyIssue[]): Promise<void> {
    console.log(`\n🗑️ Processing ${issues.length} orphaned metadata files...`);
    
    const orphanedAssets = this.report!.metadataAnalysis.assets.filter(a => a.isOrphaned);
    const totalSize = orphanedAssets.reduce((sum, a) => sum + a.size, 0);
    
    console.log(`This will free up ${this.formatBytes(totalSize)} of disk space.`);
    
    const shouldProceed = await this.confirmAction(
      `Delete ${orphanedAssets.length} unused metadata files?`
    );

    if (!shouldProceed) {
      console.log('Skipping orphaned asset cleanup.');
      return;
    }

    let deletedCount = 0;
    const deletedAssets: string[] = [];

    for (const asset of orphanedAssets) {
      try {
        // Create backup first
        const backupPath = `${asset.filePath}.backup.${Date.now()}`;
        copyFileSync(asset.filePath, backupPath);
        
        // Delete the file
        unlinkSync(asset.filePath);
        deletedAssets.push(asset.fileName);
        deletedCount++;
        
        console.log(`  ✅ Deleted: ${asset.fileName} (${this.formatBytes(asset.size)})`);
      } catch (error) {
        console.log(`  ❌ Failed to delete ${asset.fileName}: ${error}`);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount}/${orphanedAssets.length} orphaned assets`);
    
    if (deletedAssets.length > 0) {
      // Create a deletion log
      const logPath = join(Deno.cwd(), `deleted-assets-${Date.now()}.log`);
      writeFileSync(logPath, deletedAssets.join('\n'), 'utf-8');
      console.log(`📄 Deletion log saved to: ${logPath}`);
    }
  }

  /**
   * Repair missing turra entries
   */
  private async repairMissingTurras(issues: EnhancedConsistencyIssue[]): Promise<void> {
    console.log(`\n🔧 Processing ${issues.length} missing turra entries...`);
    
    const shouldProceed = await this.confirmAction(
      `Add ${issues.length} missing turra entries?`
    );

    if (!shouldProceed) {
      console.log('Skipping missing turra repair.');
      return;
    }

    // Note: turras.csv has been removed - this repair function is no longer needed

    // Load tweets to extract content
    const tweetsResult = safeReadDatabase('tweets.json');
    if (!tweetsResult.success) {
      console.log('❌ Failed to load tweets database');
      return;
    }

    const tweets = new Map<string, any>();
    for (const thread of tweetsResult.data as any[][]) {
      for (const tweet of thread) {
        tweets.set(tweet.id, tweet);
      }
    }

    let addedCount = 0;
    const newEntries: string[] = [];

    for (const issue of issues) {
      const tweetId = issue.recordId!;
      const tweet = tweets.get(tweetId);
      
      if (tweet) {
        // Extract first meaningful sentence as turra content
        const content = this.extractTurraContent(tweet.tweet);
        const csvLine = `${tweetId},"${content}",""`;
        newEntries.push(csvLine);
        addedCount++;
        
        console.log(`  ✅ Added turra for tweet ${tweetId}: ${content.substring(0, 50)}...`);
      } else {
        console.log(`  ❌ Tweet ${tweetId} not found in database`);
      }
    }

    if (newEntries.length > 0) {
      // Append new entries to CSV
      const updatedCSV = csvContent.trimEnd() + '\n' + newEntries.join('\n') + '\n';
      
      // Create backup
      const backupPath = `${turrasPath}.backup.${Date.now()}`;
      if (existsSync(turrasPath)) {
        copyFileSync(turrasPath, backupPath);
      }
      
      // Write updated CSV
      writeFileSync(turrasPath, updatedCSV, 'utf-8');
      console.log(`\n✅ Successfully added ${addedCount} turra entries`);
      console.log(`📄 Backup saved to: ${backupPath}`);
    }
  }

  /**
   * Extract meaningful content for turra entry
   */
  private extractTurraContent(tweetText: string): string {
    // Remove URLs, mentions, and clean up text
    let content = tweetText
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Take first sentence or first 100 characters
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length > 20 && firstSentence.length < 150) {
      return firstSentence.trim();
    }

    // Fallback to first 100 characters
    return content.substring(0, 100).trim() + (content.length > 100 ? '...' : '');
  }

  /**
   * Repair orphaned turra entries
   */
  private async repairOrphanedTurras(issues: EnhancedConsistencyIssue[]): Promise<void> {
    console.log(`\n🗑️ Processing ${issues.length} orphaned turra entries...`);
    
    const shouldProceed = await this.confirmAction(
      `Remove ${issues.length} orphaned turra entries?`
    );

    if (!shouldProceed) {
      console.log('Skipping orphaned turra cleanup.');
      return;
    }

    // Note: turras.csv has been removed - orphaned turra cleanup is no longer needed
    console.log('✅ Turras CSV cleanup skipped - file has been removed from system');
    return;

    if (removedCount > 0) {
      // Create backup
      const backupPath = `${turrasPath}.backup.${Date.now()}`;
      copyFileSync(turrasPath, backupPath);
      
      // Write cleaned CSV
      writeFileSync(turrasPath, filteredLines.join('\n'), 'utf-8');
      
      console.log(`✅ Successfully removed ${removedCount} orphaned turra entries`);
      console.log(`📄 Backup saved to: ${backupPath}`);
    }
  }

  /**
   * Ask user for confirmation
   */
  private async confirmAction(message: string): Promise<boolean> {
    console.log(`\n❓ ${message} (y/N)`);
    
    // In a real implementation, you'd use readline or similar for user input
    // For now, we'll auto-confirm for automation purposes
    // You can uncomment the manual confirmation code below
    
    /*
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);
    const n = await Deno.stdin.read(buffer);
    const input = decoder.decode(buffer.subarray(0, n || 0)).trim().toLowerCase();
    return input === 'y' || input === 'yes';
    */
    
    // Auto-confirm for demonstration
    console.log('⚡ Auto-confirming for automation...');
    return true;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate repair report
   */
  async generateRepairReport(): Promise<string> {
    const report = await enhancedValidator.runValidation();
    const timestamp = new Date().toISOString();
    
    let reportContent = `# Database Repair Report\n`;
    reportContent += `Generated: ${timestamp}\n\n`;
    
    reportContent += `## Summary\n`;
    reportContent += `- Overall Status: ${report.overallStatus.toUpperCase()}\n`;
    reportContent += `- Total Issues: ${report.issues.length}\n`;
    reportContent += `- Error Issues: ${report.issues.filter(i => i.severity === 'error').length}\n`;
    reportContent += `- Warning Issues: ${report.issues.filter(i => i.severity === 'warning').length}\n\n`;
    
    reportContent += `## Metadata Analysis\n`;
    reportContent += `- Total Assets: ${report.metadataAnalysis.totalAssets}\n`;
    reportContent += `- Used Assets: ${report.metadataAnalysis.usedAssets}\n`;
    reportContent += `- Orphaned Assets: ${report.metadataAnalysis.orphanedAssets}\n`;
    reportContent += `- Broken References: ${report.metadataAnalysis.brokenReferences}\n\n`;
    
    reportContent += `## Turra Analysis\n`;
    reportContent += `- Total Turras: ${report.turraAnalysis.totalTurras}\n`;
    reportContent += `- Linked Tweets: ${report.turraAnalysis.linkedTweets}\n`;
    reportContent += `- Missing Turras: ${report.turraAnalysis.missingTurras}\n`;
    reportContent += `- Orphaned Turras: ${report.turraAnalysis.orphanedTurras}\n\n`;
    
    if (report.recommendations.length > 0) {
      reportContent += `## Recommendations\n`;
      for (const rec of report.recommendations) {
        reportContent += `### ${rec.priority.toUpperCase()} Priority: ${rec.action}\n`;
        reportContent += `${rec.description}\n`;
        reportContent += `Auto-fix available: ${rec.autoFixAvailable ? 'Yes' : 'No'}\n\n`;
      }
    }
    
    if (report.issues.length > 0) {
      reportContent += `## Detailed Issues\n`;
      for (const issue of report.issues) {
        reportContent += `### ${issue.severity.toUpperCase()}: ${issue.type}\n`;
        reportContent += `- **Message**: ${issue.message}\n`;
        reportContent += `- **File**: ${issue.fileName}\n`;
        if (issue.recordId) {
          reportContent += `- **Record ID**: ${issue.recordId}\n`;
        }
        if (issue.metadata?.suggestedAction) {
          reportContent += `- **Suggested Action**: ${issue.metadata.suggestedAction}\n`;
        }
        reportContent += `\n`;
      }
    }
    
    return reportContent;
  }
}

// Export singleton instance
export const repairSystem = DatabaseRepairSystem.getInstance();