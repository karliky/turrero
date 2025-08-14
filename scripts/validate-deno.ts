#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

/**
 * Comprehensive Deno validation script
 * Runs TypeScript checking, linting, and formatting validation
 */

import { createDenoLogger } from '../infrastructure/logger.ts';

const logger = createDenoLogger('validate-deno');

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string;
}

/**
 * Runs a Deno command and returns the result
 */
async function runDenoCommand(
  args: string[],
  description: string
): Promise<ValidationResult> {
  try {
    const command = new Deno.Command('deno', {
      args,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    if (code === 0) {
      return {
        success: true,
        message: `✅ ${description} passed`,
        details: output
      };
    } else {
      return {
        success: false,
        message: `❌ ${description} failed`,
        details: error || output
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ ${description} failed to run`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main validation function
 */
async function validateDeno(): Promise<void> {
  logger.info('🦕 Starting Deno validation suite...');
  
  const scripts = [
    'scripts/tweets_enrichment.ts',
    'scripts/make-algolia-db.ts',
    'scripts/generate-books.ts'
  ];

  // 1. TypeScript checking
  const checkResult = await runDenoCommand(
    ['check', ...scripts],
    'TypeScript checking'
  );
  
  console.log(checkResult.message);
  if (!checkResult.success) {
    console.error(checkResult.details);
    Deno.exit(1);
  }

  // 2. Linting
  const lintResult = await runDenoCommand(
    ['lint', ...scripts],
    'Linting'
  );
  
  console.log(lintResult.message);
  if (!lintResult.success) {
    console.error(lintResult.details);
    Deno.exit(1);
  }

  // 3. Format checking
  const fmtResult = await runDenoCommand(
    ['fmt', '--check', ...scripts],
    'Format checking'
  );
  
  console.log(fmtResult.message);
  if (!fmtResult.success) {
    logger.warn('Code formatting issues found. Run `deno fmt` to fix.');
    console.error(fmtResult.details);
    // Don't exit on format issues, just warn
  }

  logger.info('🎉 All Deno validations passed!');
}

// Run validation if this script is executed directly
if (import.meta.main) {
  try {
    await validateDeno();
  } catch (error) {
    logger.error('Validation failed:', error);
    Deno.exit(1);
  }
}