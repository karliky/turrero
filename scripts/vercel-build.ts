#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

/**
 * Vercel-compatible build script that ensures both environments are validated
 * before deployment
 */

import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("vercel-build");

interface CommandResult {
  command: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Runs a command and returns the result
 */
async function runCommand(
  cmd: string[],
  description: string,
  cwd: string = Deno.cwd()
): Promise<CommandResult> {
  try {
    logger.info(`Running: ${description}`);
    
    const command = new Deno.Command(cmd[0]!, {
      args: cmd.slice(1),
      cwd,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);

    const success = code === 0;
    const result = {
      command: cmd.join(' '),
      success,
      output,
      error: success ? undefined : error
    };

    if (success) {
      logger.info(`✅ ${description} completed successfully`);
    } else {
      logger.error(`❌ ${description} failed`);
      if (error) console.error(error);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`💥 ${description} crashed: ${errorMessage}`);
    return {
      command: cmd.join(' '),
      success: false,
      output: '',
      error: errorMessage
    };
  }
}

/**
 * Pre-build validation for Vercel deployment
 */
async function preBuildValidation(): Promise<boolean> {
  logger.info('🔍 Running pre-build validation for Vercel...');
  
  const validations = [
    runCommand(['npm', 'run', 'lint'], 'Next.js ESLint validation'),
    runCommand(['npx', 'tsc', '--noEmit'], 'TypeScript compilation check'),
    runCommand(['deno', 'check', 'scripts/tweets_enrichment.ts'], 'Deno script validation'),
  ];

  const results = await Promise.all(validations);
  
  let allPassed = true;
  for (const result of results) {
    if (!result.success) {
      allPassed = false;
      logger.error(`Validation failed: ${result.command}`);
    }
  }

  return allPassed;
}

/**
 * Build process for Vercel
 */
async function buildForVercel(): Promise<boolean> {
  logger.info('🏗️ Building for Vercel deployment...');
  
  const buildResult = await runCommand(['npm', 'run', 'build'], 'Next.js production build');
  
  if (!buildResult.success) {
    logger.error('Build failed for Vercel deployment');
    return false;
  }

  logger.info('✅ Vercel build completed successfully');
  return true;
}

/**
 * Main build function
 */
async function main(): Promise<void> {
  logger.info('🚀 Starting Vercel-compatible build process...');
  
  // Run pre-build validation
  const validationPassed = await preBuildValidation();
  if (!validationPassed) {
    logger.error('💥 Pre-build validation failed!');
    Deno.exit(1);
  }
  
  // Run build
  const buildPassed = await buildForVercel();
  if (!buildPassed) {
    logger.error('💥 Build process failed!');
    Deno.exit(1);
  }
  
  logger.info('🎉 Vercel build process completed successfully!');
}

// Run if executed directly
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    logger.error('Vercel build failed:', error);
    Deno.exit(1);
  }
}