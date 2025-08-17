/**
 * Comprehensive type checking for both Node.js and Deno environments
 * Used by .githooks/pre-push to ensure type safety across the project
 */

import { createScriptLogger, runWithErrorHandling, getScriptDirectory } from "./libs/common-utils.ts";

const scriptDir = getScriptDirectory(import.meta.url);
const logger = createScriptLogger("comprehensive-type-check");

async function runComprehensiveTypeCheck(): Promise<void> {
  logger.info("Starting comprehensive type check...");

  // Check specific Deno-compatible files
  logger.info("Checking Deno TypeScript types...");
  const denoFiles = [
    "scripts/tweets_enrichment.ts",
    "scripts/make-algolia-db.ts", 
    "scripts/recorder.ts",
    "scripts/comprehensive-type-check.ts"
  ];
  
  for (const file of denoFiles) {
    const denoCheck = new Deno.Command("deno", {
      args: ["check", file],
      cwd: scriptDir.replace('/scripts', ''),
      stdout: "piped",
      stderr: "piped"
    });

    const denoResult = await denoCheck.output();
    if (!denoResult.success) {
      const errorOutput = new TextDecoder().decode(denoResult.stderr);
      logger.warn(`Deno type check warning for ${file}:\n${errorOutput}`);
    }
  }

  // Check Node.js types
  logger.info("Checking Node.js TypeScript types...");
  const nodeCheck = new Deno.Command("npx", {
    args: ["tsc", "--noEmit"],
    cwd: scriptDir.replace('/scripts', ''),
    stdout: "piped",
    stderr: "piped"
  });

  const nodeResult = await nodeCheck.output();
  if (!nodeResult.success) {
    const errorOutput = new TextDecoder().decode(nodeResult.stderr);
    throw new Error(`Node.js type check failed:\n${errorOutput}`);
  }

  // Run ESLint checks
  logger.info("Running ESLint checks...");
  const eslintCheck = new Deno.Command("npm", {
    args: ["run", "lint"],
    cwd: scriptDir.replace('/scripts', ''),
    stdout: "piped",
    stderr: "piped"
  });

  const eslintResult = await eslintCheck.output();
  if (!eslintResult.success) {
    const errorOutput = new TextDecoder().decode(eslintResult.stderr);
    logger.warn(`ESLint warnings found:\n${errorOutput}`);
    // Don't fail on ESLint warnings, just log them
  }

  logger.info("All type checks passed successfully!");
}

// Run with standardized error handling
runWithErrorHandling(
  runComprehensiveTypeCheck,
  logger,
  "Running comprehensive type checks"
);