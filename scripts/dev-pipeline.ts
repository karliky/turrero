#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

/**
 * Development pipeline that orchestrates both Next.js and Deno environments
 * Provides a unified interface for development workflows
 */

import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("dev-pipeline");

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
 * Validate the complete development environment
 */
async function validateEnvironment(): Promise<boolean> {
  logger.info('🔍 Validating development environment...');
  
  const validations = [
    runCommand(['npm', 'run', 'lint'], 'Next.js ESLint validation'),
    runCommand(['npm', 'run', 'deno:validate'], 'Deno validation suite'),
    runCommand(['npx', 'tsc', '--noEmit'], 'TypeScript compilation check'),
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
 * Build the complete project (Next.js + Deno compatibility)
 */
async function buildProject(): Promise<boolean> {
  logger.info('🏗️ Building complete project...');
  
  const buildSteps = [
    runCommand(['npm', 'run', 'build'], 'Next.js production build'),
    runCommand(['deno', 'fmt', '--check', 'scripts/tweets_enrichment.ts', 'scripts/make-algolia-db.ts', 'scripts/generate-books.ts'], 'Deno formatting check'),
  ];

  const results = await Promise.all(buildSteps);
  
  let allPassed = true;
  for (const result of results) {
    if (!result.success) {
      allPassed = false;
      logger.error(`Build step failed: ${result.command}`);
    }
  }

  return allPassed;
}

/**
 * Test the complete system
 */
async function testSystem(): Promise<boolean> {
  logger.info('🧪 Testing complete system...');
  
  const tests = [
    runCommand(['deno', 'run', '--allow-run', '--allow-read', '--allow-env', 'scripts/test-deno-scripts.ts'], 'Deno script tests'),
  ];

  const results = await Promise.all(tests);
  
  let allPassed = true;
  for (const result of results) {
    if (!result.success) {
      allPassed = false;
      logger.error(`Test failed: ${result.command}`);
    }
  }

  return allPassed;
}

/**
 * Main pipeline command dispatcher
 */
async function main(): Promise<void> {
  const command = Deno.args[0];
  
  switch (command) {
    case 'validate':
      const isValid = await validateEnvironment();
      if (!isValid) Deno.exit(1);
      break;
      
    case 'build':
      const buildSuccess = await buildProject();
      if (!buildSuccess) Deno.exit(1);
      break;
      
    case 'test':
      const testSuccess = await testSystem();
      if (!testSuccess) Deno.exit(1);
      break;
      
    case 'full':
      logger.info('🚀 Running full development pipeline...');
      const steps = [
        await validateEnvironment(),
        await buildProject(),
        await testSystem()
      ];
      
      if (steps.every(step => step)) {
        logger.info('🎉 Full pipeline completed successfully!');
      } else {
        logger.error('💥 Pipeline failed!');
        Deno.exit(1);
      }
      break;
      
    default:
      console.log(`
🔧 Turrero Development Pipeline

Usage: deno run --allow-run --allow-read --allow-env scripts/dev-pipeline.ts <command>

Commands:
  validate  - Validate both Next.js and Deno environments
  build     - Build the complete project
  test      - Run all tests
  full      - Run complete pipeline (validate + build + test)

Examples:
  deno run --allow-run --allow-read --allow-env scripts/dev-pipeline.ts validate
  deno run --allow-run --allow-read --allow-env scripts/dev-pipeline.ts full
      `);
      break;
  }
}

// Run if executed directly
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    logger.error('Pipeline failed:', error);
    Deno.exit(1);
  }
}