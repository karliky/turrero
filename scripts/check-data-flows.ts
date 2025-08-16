#!/usr/bin/env -S deno run --allow-read

/**
 * Data flow dependency checker for Turrero database files
 * Validates that all data dependencies are satisfied and consistent
 */

import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

interface FlowDependency {
  file: string;
  dependencies: string[];
  description: string;
  script?: string;
  type: 'auto' | 'manual' | 'derived';
}

interface FlowCheck {
  dependency: string;
  exists: boolean;
  lastModified?: Date;
  size?: number;
  error?: string;
}

interface FlowValidation {
  file: string;
  valid: boolean;
  checks: FlowCheck[];
  warnings: string[];
  errors: string[];
}

const DATA_FLOWS: FlowDependency[] = [
  {
    file: 'glosario.csv', 
    dependencies: [],
    description: 'Glossary terms and definitions',
    type: 'manual'
  },
  {
    file: 'tweets.json',
    dependencies: [],
    description: 'Scraped tweet data from X.com',
    script: 'recorder.ts',
    type: 'auto'
  },
  {
    file: 'tweets_enriched.json',
    dependencies: ['tweets.json'],
    description: 'Extracted embedded tweet metadata',
    script: 'tweets_enrichment.ts',
    type: 'auto'
  },
  {
    file: 'tweets-db.json',
    dependencies: ['tweets.json'],
    description: 'Flattened search index for Algolia',
    script: 'make-algolia-db.ts',
    type: 'auto'
  },
  {
    file: 'books-not-enriched.json',
    dependencies: ['tweets.json'],
    description: 'Raw book references from tweets',
    script: 'generate-books.ts',
    type: 'auto'
  },
  {
    file: 'books.json',
    dependencies: ['books-not-enriched.json'],
    description: 'AI-categorized book references',
    script: 'book-enrichment.ts',
    type: 'auto'
  },
  {
    file: 'tweets_map.json',
    dependencies: ['tweets.json'],
    description: 'Manual thread categorization',
    type: 'manual'
  },
  {
    file: 'tweets_summary.json',
    dependencies: ['tweets.json'],
    description: 'AI-generated thread summaries',
    type: 'manual'
  },
  {
    file: 'tweets_exam.json',
    dependencies: ['tweets.json'],
    description: 'AI-generated quiz questions',
    type: 'manual'
  },
  {
    file: 'processed_graph_data.json',
    dependencies: ['tweets.json', 'tweets_map.json', 'tweets_summary.json'],
    description: 'Aggregated data for graph visualization',
    script: 'generate-graph-data.py',
    type: 'derived'
  },
  {
    file: 'tweets_podcast.json',
    dependencies: ['tweets.json', 'tweets_enriched.json'],
    description: 'Podcast episode metadata',
    script: 'tweet-to-podcast.ts',
    type: 'derived'
  }
];

async function getFileStats(filePath: string): Promise<{ lastModified: Date; size: number } | null> {
  try {
    const stat = await Deno.stat(filePath);
    return {
      lastModified: stat.mtime || new Date(0),
      size: stat.size
    };
  } catch {
    return null;
  }
}

async function checkDependency(dependency: string): Promise<FlowCheck> {
  const filePath = join('infrastructure/db', dependency);
  const stats = await getFileStats(filePath);
  
  if (!stats) {
    return {
      dependency,
      exists: false,
      error: 'File not found'
    };
  }
  
  return {
    dependency,
    exists: true,
    lastModified: stats.lastModified,
    size: stats.size
  };
}

async function validateDataFlow(flow: FlowDependency): Promise<FlowValidation> {
  console.log(`🔍 Checking ${flow.file} (${flow.type})...`);
  
  const checks: FlowCheck[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check if the file itself exists
  const mainFileCheck = await checkDependency(flow.file);
  const fileExists = mainFileCheck.exists;
  
  if (!fileExists && flow.type !== 'manual') {
    errors.push(`Main file ${flow.file} does not exist`);
  }
  
  // Check all dependencies
  for (const dep of flow.dependencies) {
    const check = await checkDependency(dep);
    checks.push(check);
    
    if (!check.exists) {
      errors.push(`Dependency ${dep} is missing`);
    }
  }
  
  // Temporal consistency checks
  if (fileExists && mainFileCheck.lastModified) {
    for (const check of checks) {
      if (check.exists && check.lastModified) {
        const depAge = check.lastModified.getTime();
        const fileAge = mainFileCheck.lastModified!.getTime();
        
        // If dependency is newer than derived file, warn about staleness
        if (depAge > fileAge && flow.type === 'auto') {
          const hoursDiff = (depAge - fileAge) / (1000 * 60 * 60);
          warnings.push(
            `${check.dependency} is ${hoursDiff.toFixed(1)} hours newer than ${flow.file} - consider regenerating`
          );
        }
      }
    }
  }
  
  // Size validation
  if (fileExists && mainFileCheck.size === 0) {
    errors.push(`${flow.file} is empty`);
  }
  
  // Special validations
  if (flow.file === 'tweets.json' && fileExists) {
    // tweets.json should be substantial
    if (mainFileCheck.size! < 1000000) { // Less than 1MB
      warnings.push(`${flow.file} seems unusually small (${(mainFileCheck.size! / 1024).toFixed(0)}KB)`);
    }
  }
  
  if (flow.file === 'tweets-db.json' && fileExists) {
    // tweets-db.json should be smaller than tweets.json but not tiny
    const tweetsCheck = await checkDependency('tweets.json');
    if (tweetsCheck.exists && tweetsCheck.size! > 0 && mainFileCheck.size! > tweetsCheck.size!) {
      warnings.push(`${flow.file} is larger than its source tweets.json - this is unusual`);
    }
  }
  
  const isValid = errors.length === 0;
  
  console.log(`  ${isValid ? '✅' : '❌'} ${flow.description}`);
  if (warnings.length > 0) {
    console.log(`  ⚠️  ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`);
  }
  if (errors.length > 0) {
    console.log(`  ❌ ${errors.length} error${errors.length > 1 ? 's' : ''}`);
  }
  
  return {
    file: flow.file,
    valid: isValid,
    checks,
    warnings,
    errors
  };
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = hours / 24;
  
  if (days > 1) {
    return `${days.toFixed(1)} days ago`;
  } else {
    return `${hours.toFixed(1)} hours ago`;
  }
}

async function checkAllDataFlows(): Promise<FlowValidation[]> {
  console.log('🚀 Starting data flow dependency checks\n');
  
  const results: FlowValidation[] = [];
  
  for (const flow of DATA_FLOWS) {
    const result = await validateDataFlow(flow);
    results.push(result);
    console.log(''); // Empty line between checks
  }
  
  return results;
}

async function printDetailedReport(results: FlowValidation[]): Promise<void> {
  console.log('📊 Detailed Data Flow Report');
  console.log('═'.repeat(60));
  
  for (const result of results) {
    const flow = DATA_FLOWS.find(f => f.file === result.file)!;
    
    console.log(`\n📄 ${result.file} (${flow.type})`);
    console.log(`   ${flow.description}`);
    
    if (flow.script) {
      console.log(`   Generated by: ${flow.script}`);
    }
    
    // File info
    const mainCheck = await checkDependency(result.file);
    if (mainCheck.exists) {
      console.log(`   Size: ${formatFileSize(mainCheck.size!)}`);
      console.log(`   Modified: ${formatTimeAgo(mainCheck.lastModified!)}`);
    } else {
      console.log(`   Status: ❌ Not found`);
    }
    
    // Dependencies
    if (result.checks.length > 0) {
      console.log(`   Dependencies:`);
      for (const check of result.checks) {
        const status = check.exists ? '✅' : '❌';
        const size = check.size ? formatFileSize(check.size) : 'N/A';
        const age = check.lastModified ? formatTimeAgo(check.lastModified) : 'N/A';
        console.log(`     ${status} ${check.dependency} (${size}, ${age})`);
      }
    }
    
    // Warnings and errors
    if (result.warnings.length > 0) {
      console.log(`   Warnings:`);
      for (const warning of result.warnings) {
        console.log(`     ⚠️  ${warning}`);
      }
    }
    
    if (result.errors.length > 0) {
      console.log(`   Errors:`);
      for (const error of result.errors) {
        console.log(`     ❌ ${error}`);
      }
    }
  }
}

function printSummary(results: FlowValidation[]): void {
  console.log('\n' + '═'.repeat(60));
  console.log('📈 Summary');
  console.log('═'.repeat(60));
  
  const validFlows = results.filter(r => r.valid);
  const invalidFlows = results.filter(r => !r.valid);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  console.log(`✅ Valid flows: ${validFlows.length}/${results.length}`);
  console.log(`❌ Invalid flows: ${invalidFlows.length}`);
  console.log(`⚠️  Total warnings: ${totalWarnings}`);
  console.log(`💥 Total errors: ${totalErrors}`);
  
  // Flow type breakdown
  const autoFlows = results.filter(r => DATA_FLOWS.find(f => f.file === r.file)?.type === 'auto');
  const manualFlows = results.filter(r => DATA_FLOWS.find(f => f.file === r.file)?.type === 'manual');
  const derivedFlows = results.filter(r => DATA_FLOWS.find(f => f.file === r.file)?.type === 'derived');
  
  console.log(`\n📊 By Type:`);
  console.log(`   Auto-generated: ${autoFlows.filter(r => r.valid).length}/${autoFlows.length}`);
  console.log(`   Manual files: ${manualFlows.filter(r => r.valid).length}/${manualFlows.length}`);
  console.log(`   Derived files: ${derivedFlows.filter(r => r.valid).length}/${derivedFlows.length}`);
  
  if (invalidFlows.length > 0) {
    console.log(`\n❌ Files needing attention:`);
    for (const flow of invalidFlows) {
      const flowDef = DATA_FLOWS.find(f => f.file === flow.file)!;
      console.log(`   ${flow.file} - ${flowDef.description}`);
      if (flowDef.script) {
        console.log(`     Run: deno task ${flowDef.script.replace('.ts', '')}`);
      }
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(invalidFlows.length === 0 && totalWarnings === 0 
    ? '🎉 All data flows are healthy!' 
    : '⚠️  Some issues found - see details above');
}

// Main execution
if (import.meta.main) {
  try {
    const results = await checkAllDataFlows();
    await printDetailedReport(results);
    printSummary(results);
    
    const hasErrors = results.some(r => !r.valid);
    Deno.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Fatal error during flow check:', error.message);
    Deno.exit(1);
  }
}