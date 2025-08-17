#!/usr/bin/env -S deno run --allow-all

import { enhancedValidator, type ValidationReport, type EnhancedConsistencyIssue, type MetadataAsset } from './lib/enhanced-db-validator.ts';
import { repairSystem } from './lib/db-repair-system.ts';

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
};

/**
 * Print colored console output
 */
function printColored(text: string, color: string): void {
  console.log(`${color}${text}${colors.reset}`);
}

/**
 * Print validation report in a user-friendly format
 */
function printValidationReport(report: ValidationReport, verbose: boolean = false): void {
  // Header with ASCII art
  printColored('\n' + '='.repeat(60), colors.bold + colors.cyan);
  printColored('🔍 ENHANCED DATABASE INTEGRITY VALIDATION', colors.bold + colors.cyan);
  printColored('='.repeat(60), colors.bold + colors.cyan);
  console.log(`🕐 Timestamp: ${report.timestamp}`);
  
  // Overall status with appropriate styling
  const statusColor = report.overallStatus === 'healthy' ? colors.green : 
                     report.overallStatus === 'warning' ? colors.yellow : colors.red;
  const statusEmoji = report.overallStatus === 'healthy' ? '✅' : 
                     report.overallStatus === 'warning' ? '⚠️' : '❌';
  
  printColored(`\n${statusEmoji} Overall Status: ${report.overallStatus.toUpperCase()}`, colors.bold + statusColor);
  
  // Enhanced summary
  printColored('\n📊 SUMMARY OVERVIEW', colors.bold + colors.blue);
  console.log(`├── Total Issues Found: ${report.issues.length}`);
  console.log(`├── 🚨 Critical Errors: ${report.issues.filter((i: EnhancedConsistencyIssue) => i.severity === 'error').length}`);
  console.log(`├── ⚠️  Warnings: ${report.issues.filter((i: EnhancedConsistencyIssue) => i.severity === 'warning').length}`);
  console.log(`└── 📈 Overall Health: ${report.overallStatus}`);

  // Metadata analysis
  printColored('\n🖼️  METADATA ANALYSIS', colors.bold + colors.magenta);
  console.log(`├── Total Assets: ${report.metadataAnalysis.totalAssets}`);
  console.log(`├── 🟢 Used Assets: ${report.metadataAnalysis.usedAssets}`);
  console.log(`├── 🔴 Orphaned Assets: ${report.metadataAnalysis.orphanedAssets}`);
  console.log(`└── 💔 Broken References: ${report.metadataAnalysis.brokenReferences}`);

  if (report.metadataAnalysis.orphanedAssets > 0) {
    const orphanedAssets = report.metadataAnalysis.assets.filter((a: MetadataAsset) => a.isOrphaned);
    const totalSize = orphanedAssets.reduce((sum: number, a: MetadataAsset) => sum + a.size, 0);
    console.log(`    💾 Potential savings: ${formatBytes(totalSize)}`);
  }

  // Turra analysis
  printColored('\n🔗 TURRA CONSISTENCY ANALYSIS', colors.bold + colors.cyan);
  console.log(`├── Total Turras: ${report.turraAnalysis.totalTurras}`);
  console.log(`├── 🔗 Linked Tweets: ${report.turraAnalysis.linkedTweets}`);
  console.log(`├── ❓ Missing Turras: ${report.turraAnalysis.missingTurras}`);
  console.log(`└── 🗑️  Orphaned Turras: ${report.turraAnalysis.orphanedTurras}`);

  // Issue breakdown
  if (report.issues.length > 0) {
    printColored('\n🐛 ISSUE BREAKDOWN', colors.bold + colors.yellow);
    
    const issueTypes = new Map<string, number>();
    for (const issue of report.issues) {
      issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
    }

    for (const [type, count] of issueTypes.entries()) {
      const emoji = getIssueEmoji(type);
      console.log(`├── ${emoji} ${formatIssueType(type)}: ${count}`);
    }

    if (verbose) {
      printColored('\n📋 DETAILED ISSUES', colors.bold);
      const errorIssues = report.issues.filter((i: EnhancedConsistencyIssue) => i.severity === 'error');
      const warningIssues = report.issues.filter((i: EnhancedConsistencyIssue) => i.severity === 'warning');

      if (errorIssues.length > 0) {
        printColored('\n🚨 CRITICAL ERRORS', colors.red + colors.bold);
        for (const issue of errorIssues) {
          console.log(`  ❌ ${issue.message}`);
          console.log(`     📁 File: ${issue.fileName}${issue.recordId ? `, ID: ${issue.recordId}` : ''}`);
          if (issue.metadata?.suggestedAction) {
            console.log(`     💡 Suggested: ${issue.metadata.suggestedAction}`);
          }
        }
      }

      if (warningIssues.length > 0) {
        printColored('\n⚠️  WARNINGS', colors.yellow + colors.bold);
        for (const issue of warningIssues.slice(0, 10)) { // Show first 10
          console.log(`  ⚠️  ${issue.message}`);
          console.log(`     📁 File: ${issue.fileName}${issue.recordId ? `, ID: ${issue.recordId}` : ''}`);
          if (issue.metadata?.suggestedAction) {
            console.log(`     💡 Suggested: ${issue.metadata.suggestedAction}`);
          }
        }
        if (warningIssues.length > 10) {
          console.log(`     ... and ${warningIssues.length - 10} more warnings`);
        }
      }
    }
  } else {
    printColored('\n🎉 NO ISSUES FOUND', colors.green + colors.bold);
    console.log('Your database is in excellent condition!');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    printColored('\n💡 ACTIONABLE RECOMMENDATIONS', colors.bold + colors.blue);
    
    const highPriority = report.recommendations.filter((r) => r.priority === 'high');
    const mediumPriority = report.recommendations.filter((r) => r.priority === 'medium');
    const lowPriority = report.recommendations.filter((r) => r.priority === 'low');

    if (highPriority.length > 0) {
      printColored('\n🔥 HIGH PRIORITY', colors.red + colors.bold);
      for (const rec of highPriority) {
        console.log(`  🚨 ${rec.action}`);
        console.log(`     ${rec.description}`);
        console.log(`     🤖 Auto-fix: ${rec.autoFixAvailable ? '✅ Available' : '❌ Manual required'}`);
      }
    }

    if (mediumPriority.length > 0) {
      printColored('\n📋 MEDIUM PRIORITY', colors.yellow + colors.bold);
      for (const rec of mediumPriority) {
        console.log(`  ⚠️  ${rec.action}`);
        console.log(`     ${rec.description}`);
        console.log(`     🤖 Auto-fix: ${rec.autoFixAvailable ? '✅ Available' : '❌ Manual required'}`);
      }
    }

    if (lowPriority.length > 0 && verbose) {
      printColored('\n📝 LOW PRIORITY', colors.cyan);
      for (const rec of lowPriority) {
        console.log(`  ℹ️  ${rec.action}`);
        console.log(`     ${rec.description}`);
        console.log(`     🤖 Auto-fix: ${rec.autoFixAvailable ? '✅ Available' : '❌ Manual required'}`);
      }
    }
  }

  // Usage suggestions
  printColored('\n🚀 NEXT STEPS', colors.bold + colors.green);
  
  const autoFixAvailable = report.recommendations.some((r) => r.autoFixAvailable);
  
  if (autoFixAvailable) {
    console.log('  1. 🔧 Run interactive repair: `deno task db:validate:fix`');
  }
  if (report.metadataAnalysis.orphanedAssets > 0) {
    console.log('  2. 🧹 Clean metadata: `deno task db:cleanup:metadata`');
  }
  if (report.turraAnalysis.missingTurras > 0) {
    console.log('  3. 🔗 Fix turras: `deno task db:repair:turras`');
  }
  console.log('  4. 📊 Save report: `deno task db:validate:save`');
  console.log('  5. 🔍 Verbose mode: `deno task db:validate:verbose`');

  console.log(''); // Empty line at end
}

/**
 * Get emoji for issue type
 */
function getIssueEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    'unused_metadata': '🗑️',
    'missing_turra': '🔗',
    'orphaned_turra': '👻',
    'broken_asset_reference': '💔',
    'semantic_duplicate': '👥',
    'duplicate_id': '🔄',
    'orphaned_record': '🏝️',
    'missing_reference': '❓',
    'invalid_reference': '❌'
  };
  return emojiMap[type] || '⚠️';
}

/**
 * Format issue type for display
 */
function formatIssueType(type: string): string {
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
  return typeMap[type] || type.replace('_', ' ');
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Save report to file
 */
async function saveReportToFile(report: ValidationReport, filePath: string): Promise<void> {
  try {
    const reportContent = await repairSystem.generateRepairReport();
    Deno.writeTextFileSync(filePath, reportContent);
    printColored(`📄 Report saved to: ${filePath}`, colors.green);
  } catch (error) {
    printColored(`❌ Failed to save report: ${error}`, colors.red);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = Deno.args;
  const verbose = args.includes('--verbose') || args.includes('-v');
  const saveReport = args.includes('--save-report');
  const helpRequested = args.includes('--help') || args.includes('-h');
  const fixMode = args.includes('--fix') || args.includes('-f');
  const dryRun = args.includes('--dry-run');
  const _comprehensive = args.includes('--comprehensive') || args.includes('-c');

  if (helpRequested) {
    console.log(`
${colors.bold + colors.cyan}Enhanced Database Integrity Validator${colors.reset}

${colors.bold}Usage:${colors.reset} deno run --allow-all scripts/enhanced-validate-db-integrity.ts [options]

${colors.bold}Options:${colors.reset}
  --verbose, -v        Show detailed information for all issues
  --save-report        Save validation report to markdown file
  --fix, -f           Run interactive repair mode
  --dry-run           Show repair plan without making changes
  --comprehensive, -c  Run most thorough validation (same as default)
  --help, -h          Show this help message

${colors.bold}Examples:${colors.reset}
  ${colors.cyan}# Basic validation${colors.reset}
  deno task db:validate:comprehensive

  ${colors.cyan}# Verbose validation with detailed output${colors.reset}
  deno task db:validate:verbose

  ${colors.cyan}# Interactive repair mode${colors.reset}
  deno task db:validate:fix

  ${colors.cyan}# Dry run to see what would be fixed${colors.reset}
  deno run --allow-all scripts/enhanced-validate-db-integrity.ts --fix --dry-run

  ${colors.cyan}# Save detailed report${colors.reset}
  deno task db:validate:save

${colors.bold}Available Deno Tasks:${colors.reset}
  deno task db:validate:comprehensive  - Full validation with cleanup suggestions
  deno task db:validate:fix           - Interactive repair mode
  deno task db:cleanup:metadata       - Clean unused metadata files
  deno task db:repair:turras          - Fix tweet-turra inconsistencies
`);
    return;
  }

  try {
    if (fixMode) {
      // Interactive repair mode
      await repairSystem.runInteractiveRepair(dryRun);
    } else {
      // Validation mode
      printColored('🚀 Starting enhanced database validation...', colors.bold + colors.blue);
      
      const report = await enhancedValidator.runValidation();
      
      // Print report to console
      printValidationReport(report, verbose);
      
      // Save report if requested
      if (saveReport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `enhanced-db-report-${timestamp}.md`;
        await saveReportToFile(report, reportPath);
      }
      
      // Exit with appropriate code
      if (report.overallStatus === 'error') {
        printColored('\n💥 Validation completed with ERRORS. Please fix critical issues immediately.', colors.red + colors.bold);
        Deno.exit(1);
      } else if (report.overallStatus === 'warning') {
        printColored('\n⚠️  Validation completed with WARNINGS. Consider reviewing and fixing issues.', colors.yellow + colors.bold);
        Deno.exit(0);
      } else {
        printColored('\n🎉 Validation completed successfully. Database integrity is excellent!', colors.green + colors.bold);
        Deno.exit(0);
      }
    }
  } catch (error) {
    printColored(`💥 Validation failed: ${error instanceof Error ? error.message : String(error)}`, colors.red + colors.bold);
    console.error(error);
    Deno.exit(1);
  }
}

// Run main function if script is executed directly
if (import.meta.main) {
  main();
}