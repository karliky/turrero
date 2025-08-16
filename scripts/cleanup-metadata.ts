#!/usr/bin/env -S deno run --allow-all

/**
 * Specialized metadata cleanup script
 * Focuses specifically on identifying and cleaning unused metadata files
 */

import { enhancedValidator } from './lib/enhanced-db-validator.ts';
import { repairSystem } from './lib/db-repair-system.ts';

async function main(): Promise<void> {
  const args = Deno.args;
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const helpRequested = args.includes('--help') || args.includes('-h');

  if (helpRequested) {
    console.log(`
🧹 Metadata Cleanup Tool

Usage: deno run --allow-all scripts/cleanup-metadata.ts [options]

Options:
  --dry-run    Show what would be cleaned without making changes
  --verbose    Show detailed information about each file
  --help       Show this help message

Examples:
  deno task db:cleanup:metadata
  deno run --allow-all scripts/cleanup-metadata.ts --dry-run
  deno run --allow-all scripts/cleanup-metadata.ts --verbose
`);
    return;
  }

  console.log('🧹 Starting metadata cleanup analysis...\n');

  try {
    // Run validation to get metadata analysis
    const report = await enhancedValidator.runValidation();
    
    const orphanedAssets = report.metadataAnalysis.assets.filter(a => a.isOrphaned);
    const totalSize = orphanedAssets.reduce((sum, a) => sum + a.size, 0);
    
    console.log(`📊 Metadata Analysis Results:`);
    console.log(`  • Total assets: ${report.metadataAnalysis.totalAssets}`);
    console.log(`  • Used assets: ${report.metadataAnalysis.usedAssets}`);
    console.log(`  • Orphaned assets: ${report.metadataAnalysis.orphanedAssets}`);
    console.log(`  • Potential space savings: ${formatBytes(totalSize)}`);

    if (orphanedAssets.length === 0) {
      console.log('\n✅ No orphaned metadata files found! Your assets are well-organized.');
      return;
    }

    if (verbose) {
      console.log('\n📋 Orphaned Assets Details:');
      for (const asset of orphanedAssets) {
        console.log(`  🗑️  ${asset.fileName} (${formatBytes(asset.size)})`);
        if (asset.referencedIn.length > 0) {
          console.log(`      Referenced in: ${asset.referencedIn.join(', ')}`);
        }
      }
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - Files that would be cleaned:');
      for (const asset of orphanedAssets) {
        console.log(`  🗑️  DELETE: ${asset.fileName} (${formatBytes(asset.size)})`);
      }
      console.log(`\nTotal files to delete: ${orphanedAssets.length}`);
      console.log(`Total space to free: ${formatBytes(totalSize)}`);
    } else {
      // Run actual cleanup through repair system
      console.log('\n🧹 Proceeding with metadata cleanup...');
      await repairSystem.runInteractiveRepair();
    }

  } catch (error) {
    console.error(`❌ Metadata cleanup failed: ${error}`);
    Deno.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

if (import.meta.main) {
  main();
}