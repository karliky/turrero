#!/usr/bin/env -S deno run --allow-read --allow-run

/**
 * TypeScript validation script for development
 * 
 * This script validates TypeScript compilation and type checking
 * for both the main project and Deno scripts.
 */

import { existsSync } from 'https://deno.land/std@0.208.0/fs/mod.ts';
import { join } from 'https://deno.land/std@0.208.0/path/mod.ts';
import { ScriptMode, TweetMetadataType, ProcessingState } from "../infrastructure/types/index.ts";

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string;
}

interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

/**
 * Print colored message to console
 */
function printColored(color: keyof typeof colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Run a command and return the result
 */
async function runCommand(cmd: string[], cwd?: string): Promise<{ success: boolean; output: string; error: string }> {
  try {
    const command = new Deno.Command(cmd[0]!, {
      args: cmd.slice(1),
      cwd: cwd || Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();
    
    return {
      success: code === 0,
      output: new TextDecoder().decode(stdout),
      error: new TextDecoder().decode(stderr),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: '',
      error: `Command execution failed: ${errorMessage}`,
    };
  }
}

/**
 * Check if required tools are available
 */
async function checkDependencies(): Promise<ValidationResult[]> {
  const tools = [
    { name: 'deno', cmd: ['deno', '--version'] },
    { name: 'node', cmd: ['node', '--version'] },
    { name: 'npm', cmd: ['npm', '--version'] },
  ];

  const results: ValidationResult[] = [];

  for (const tool of tools) {
    const result = await runCommand(tool.cmd);
    results.push({
      success: result.success,
      message: `${tool.name} is ${result.success ? 'available' : 'missing'}`,
      details: result.success ? result.output.trim() : result.error,
    });
  }

  return results;
}

/**
 * Validate TypeScript compilation for main project
 */
async function validateMainProjectTS(): Promise<ValidationResult> {
  printColored('cyan', '📁 Validating main project TypeScript...');
  
  const result = await runCommand(['npx', 'tsc', '--noEmit']);
  
  return {
    success: result.success,
    message: result.success 
      ? 'Main project TypeScript compilation passed'
      : 'Main project TypeScript compilation failed',
    details: result.error || result.output,
  };
}

/**
 * Validate Deno TypeScript files
 */
async function validateDenoTS(): Promise<ValidationResult> {
  printColored('cyan', '🦕 Validating Deno TypeScript files...');
  
  // Get all TypeScript files in scripts directory
  const scriptsDir = join(Deno.cwd(), 'scripts');
  const tsFiles: string[] = [];
  
  try {
    const denoOnlyFiles = [
      'validate-types.ts'
    ];
    
    for await (const entry of Deno.readDir(scriptsDir)) {
      if (entry.isFile && entry.name.endsWith('.ts') && denoOnlyFiles.includes(entry.name)) {
        tsFiles.push(join(scriptsDir, entry.name));
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to read scripts directory',
      details: errorMessage,
    };
  }

  if (tsFiles.length === 0) {
    return {
      success: false,
      message: 'No TypeScript files found in scripts directory',
    };
  }

  const result = await runCommand(['deno', 'check', ...tsFiles]);
  
  return {
    success: result.success,
    message: result.success 
      ? `Deno TypeScript validation passed for ${tsFiles.length} files`
      : 'Deno TypeScript validation failed',
    details: result.error || result.output,
  };
}

/**
 * Check for remaining 'any' types in critical files
 */
async function checkForAnyTypes(): Promise<ValidationResult> {
  printColored('cyan', '🔍 Checking for remaining \'any\' types...');
  
  const patterns = [':s*any\\b', 'as\\s+any\\b'];
  const searchDirs = ['scripts', 'infrastructure/types'];
  
  for (const dir of searchDirs) {
    const fullDir = join(Deno.cwd(), dir);
    if (!existsSync(fullDir)) {
      continue;
    }

    for await (const entry of Deno.readDir(fullDir)) {
      if (entry.isFile && entry.name.endsWith('.ts')) {
        const filePath = join(fullDir, entry.name);
        const content = await Deno.readTextFile(filePath);
        
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, 'g');
          const matches = content.match(regex);
          
          if (matches) {
            return {
              success: false,
              message: 'Found remaining \'any\' types in TypeScript files',
              details: `Found in ${filePath}: ${matches.join(', ')}`,
            };
          }
        }
      }
    }
  }
  
  return {
    success: true,
    message: 'No \'any\' types found in critical files',
  };
}

/**
 * Validate enum usage consistency
 */
async function validateEnumUsage(): Promise<ValidationResult> {
  printColored('cyan', '📋 Checking enum usage consistency...');
  
  // Import enums to check for usage - magic strings that should use enums
  const magicStrings = [
    // Environment types - should use ScriptMode enum
    `"${ScriptMode.DEVELOPMENT}"`, `"${ScriptMode.PRODUCTION}"`, `"${ScriptMode.TEST}"`,
    // Metadata types - should use TweetMetadataType enum  
    `"${TweetMetadataType.CARD}"`, `"${TweetMetadataType.EMBED}"`, `"${TweetMetadataType.IMAGE}"`,
    // Processing states - should use ProcessingState enum
    `"${ProcessingState.PENDING}"`, `"${ProcessingState.PROCESSING}"`, `"${ProcessingState.COMPLETED}"`, `"${ProcessingState.ERROR}"`,
  ];
  
  const issues: string[] = [];
  const scriptsDir = join(Deno.cwd(), 'scripts');
  
  try {
    const filesToCheck = [
      'scraping.ts',
      'tweets_enrichment.ts'
    ];
    
    for await (const entry of Deno.readDir(scriptsDir)) {
      if (entry.isFile && entry.name.endsWith('.ts') && filesToCheck.includes(entry.name)) {
        const filePath = join(scriptsDir, entry.name);
        const content = await Deno.readTextFile(filePath);
        
        // Skip imports and enum definitions
        const lines = content.split('\n').filter(line => 
          !line.includes('import') && 
          !line.includes('enum') &&
          !line.includes('export const')
        );
        
        const fileContent = lines.join('\n');
        
        for (const magicString of magicStrings) {
          if (fileContent.includes(magicString)) {
            issues.push(`${entry.name}: Found magic string ${magicString}`);
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Failed to validate enum usage',
      details: errorMessage,
    };
  }
  
  if (issues.length > 0) {
    return {
      success: false,
      message: 'Found magic strings that should use enums',
      details: issues.join('\n'),
    };
  }
  
  return {
    success: true,
    message: 'Enum usage is consistent',
  };
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  printColored('blue', '🔍 Starting TypeScript validation...\n');
  
  const summary: ValidationSummary = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    results: [],
  };

  // Check dependencies
  printColored('yellow', '🔧 Checking dependencies...');
  const depResults = await checkDependencies();
  summary.results.push(...depResults);
  
  // Only proceed if basic tools are available
  const criticalDeps = depResults.filter(r => {
    const firstWord = r.message.split(' ')[0];
    return firstWord && ['deno', 'node'].includes(firstWord);
  });
  if (criticalDeps.some(r => !r.success)) {
    printColored('red', '❌ Critical dependencies missing!');
    Deno.exit(1);
  }

  // Run all validations
  const validations = [
    validateMainProjectTS,
    validateDenoTS,
    checkForAnyTypes,
    validateEnumUsage,
  ];

  for (const validation of validations) {
    try {
      const result = await validation();
      summary.results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.results.push({
        success: false,
        message: `Validation error: ${validation.name}`,
        details: errorMessage,
      });
    }
  }

  // Calculate summary
  summary.totalChecks = summary.results.length;
  summary.passed = summary.results.filter(r => r.success).length;
  summary.failed = summary.totalChecks - summary.passed;

  // Print results
  console.log('\n' + '='.repeat(60));
  printColored('blue', '📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  for (const result of summary.results) {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    printColored(color, `${icon} ${result.message}`);
    
    if (result.details && !result.success) {
      console.log(`   Details: ${result.details}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  printColored('blue', `Total: ${summary.totalChecks} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
  console.log('='.repeat(60));

  if (summary.failed > 0) {
    printColored('red', '\n💥 Validation failed! Please fix the issues above.');
    Deno.exit(1);
  } else {
    printColored('green', '\n🎉 All validations passed! TypeScript system is robust.');
    Deno.exit(0);
  }
}

// Run the validation if this script is executed directly
if (import.meta.main) {
  await main();
}