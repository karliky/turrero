#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

/**
 * Basic tests for Deno scripts to ensure they import correctly
 * and basic functionality works
 */

import { createDenoLogger } from "../infrastructure/logger.ts";

const logger = createDenoLogger("test-deno-scripts");

interface TestResult {
  name: string;
  success: boolean;
  message: string;
}

/**
 * Test that a module can be type-checked with Deno
 */
async function testModuleTypeCheck(modulePath: string, testName: string): Promise<TestResult> {
  try {
    const command = new Deno.Command('deno', {
      args: ['check', modulePath],
      cwd: Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stderr } = await command.output();
    const error = new TextDecoder().decode(stderr);

    if (code === 0) {
      return {
        name: testName,
        success: true,
        message: `✅ ${testName} type-checked successfully`
      };
    } else {
      return {
        name: testName,
        success: false,
        message: `❌ ${testName} failed type check: ${error}`
      };
    }
  } catch (error) {
    return {
      name: testName,
      success: false,
      message: `❌ ${testName} failed to run: ${error}`
    };
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  logger.info('🧪 Starting Deno script tests...');
  
  const tests = [
    testModuleTypeCheck('scripts/libs/common-utils.ts', 'Common Utils'),
    testModuleTypeCheck('scripts/libs/data-access.ts', 'Data Access'),
    testModuleTypeCheck('scripts/libs/enrichment-utils.ts', 'Enrichment Utils'),
    testModuleTypeCheck('scripts/tweets_enrichment.ts', 'Tweets Enrichment'),
    testModuleTypeCheck('scripts/make-algolia-db.ts', 'Make Algolia DB'),
    testModuleTypeCheck('scripts/generate-books.ts', 'Generate Books'),
  ];

  const results = await Promise.all(tests);
  
  let allPassed = true;
  for (const result of results) {
    console.log(result.message);
    if (!result.success) {
      allPassed = false;
    }
  }

  if (allPassed) {
    logger.info('🎉 All Deno script tests passed!');
  } else {
    logger.error('💥 Some Deno script tests failed!');
    Deno.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.main) {
  try {
    await runTests();
  } catch (error) {
    logger.error('Test runner failed:', error);
    Deno.exit(1);
  }
}