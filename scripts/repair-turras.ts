#!/usr/bin/env -S deno run --allow-all

/**
 * Specialized turra repair script
 * Focuses specifically on tweet-turra consistency issues
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
🔗 Turra Repair Tool

Usage: deno run --allow-all scripts/repair-turras.ts [options]

Options:
  --dry-run    Show what would be repaired without making changes
  --verbose    Show detailed information about each issue
  --help       Show this help message

Examples:
  deno task db:repair:turras
  deno run --allow-all scripts/repair-turras.ts --dry-run
  deno run --allow-all scripts/repair-turras.ts --verbose
`);
    return;
  }

  console.log('🔗 Starting turra consistency analysis...\n');

  try {
    // Run validation to get turra analysis
    const report = await enhancedValidator.runValidation();
    
    console.log(`📊 Turra Consistency Analysis:`);
    console.log(`  • Total turras: ${report.turraAnalysis.totalTurras}`);
    console.log(`  • Linked tweets: ${report.turraAnalysis.linkedTweets}`);
    console.log(`  • Missing turra entries: ${report.turraAnalysis.missingTurras}`);
    console.log(`  • Orphaned turra entries: ${report.turraAnalysis.orphanedTurras}`);

    const missingTurraIssues = report.issues.filter(i => i.type === 'missing_turra');
    const orphanedTurraIssues = report.issues.filter(i => i.type === 'orphaned_turra');
    const semanticDuplicates = report.issues.filter(i => i.type === 'semantic_duplicate');

    if (missingTurraIssues.length === 0 && orphanedTurraIssues.length === 0 && semanticDuplicates.length === 0) {
      console.log('\n✅ Turra consistency is excellent! No issues found.');
      return;
    }

    if (verbose) {
      if (missingTurraIssues.length > 0) {
        console.log('\n❓ Missing Turra Entries:');
        for (const issue of missingTurraIssues.slice(0, 10)) {
          console.log(`  • Tweet ID: ${issue.recordId}`);
        }
        if (missingTurraIssues.length > 10) {
          console.log(`  ... and ${missingTurraIssues.length - 10} more`);
        }
      }

      if (orphanedTurraIssues.length > 0) {
        console.log('\n👻 Orphaned Turra Entries:');
        for (const issue of orphanedTurraIssues.slice(0, 10)) {
          console.log(`  • Turra ID: ${issue.recordId}`);
        }
        if (orphanedTurraIssues.length > 10) {
          console.log(`  ... and ${orphanedTurraIssues.length - 10} more`);
        }
      }

      if (semanticDuplicates.length > 0) {
        console.log('\n👥 Semantic Duplicates:');
        for (const issue of semanticDuplicates) {
          console.log(`  • Duplicate content in: ${issue.metadata?.referencedIn?.join(', ')}`);
        }
      }
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - Repairs that would be performed:');
      
      if (missingTurraIssues.length > 0) {
        console.log(`  ➕ ADD ${missingTurraIssues.length} missing turra entries`);
      }
      
      if (orphanedTurraIssues.length > 0) {
        console.log(`  🗑️  REMOVE ${orphanedTurraIssues.length} orphaned turra entries`);
      }
      
      if (semanticDuplicates.length > 0) {
        console.log(`  🔍 REVIEW ${semanticDuplicates.length} semantic duplicates (manual review recommended)`);
      }
    } else {
      // Run actual repair through repair system
      console.log('\n🔧 Proceeding with turra repairs...');
      await repairSystem.runInteractiveRepair();
    }

  } catch (error) {
    console.error(`❌ Turra repair failed: ${error}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}