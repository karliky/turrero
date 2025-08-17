/**
 * Common utilities shared across scripts to eliminate code duplication
 */

import { dirname, join } from '@std/path';
import { createDenoLogger } from '../../infrastructure/logger.ts';

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Gets the directory path for ES modules (Deno compatible)
 * Replaces duplicate __filename and __dirname patterns
 */
export function getScriptDirectory(importMetaUrl: string): string {
  return dirname(new URL(importMetaUrl).pathname);
}

/**
 * Gets the project root directory from scripts folder
 */
export function getProjectRoot(scriptDir: string): string {
  return join(scriptDir, '../');
}

/**
 * Gets the database directory path
 */
export function getDbPath(scriptDir: string): string {
  return join(getProjectRoot(scriptDir), 'infrastructure/db');
}

/**
 * Gets a specific database file path
 */
export function getDbFilePath(scriptDir: string, filename: string): string {
  return join(getDbPath(scriptDir), filename);
}

// ============================================================================
// LOGGER UTILITIES
// ============================================================================

/**
 * Creates a standardized logger with script prefix
 * Eliminates duplicate logger initialization patterns
 */
export function createScriptLogger(scriptName: string) {
  return createDenoLogger(scriptName);
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Safely reads a JSON file with error handling
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
  }
}

/**
 * Safely writes a JSON file with error handling and formatting
 */
export async function writeJsonFile<T = unknown>(filePath: string, data: T): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 4);
    await Deno.writeTextFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

/**
 * Safely reads a CSV file
 */
export async function readCsvFile(filePath: string): Promise<string> {
  try {
    return await Deno.readTextFile(filePath);
  } catch (error) {
    throw new Error(`Failed to read CSV file ${filePath}: ${error}`);
  }
}

/**
 * Safely writes a CSV file
 */
export async function writeCsvFile(filePath: string, content: string): Promise<void> {
  try {
    await Deno.writeTextFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write CSV file ${filePath}: ${error}`);
  }
}

// ============================================================================
// BROWSER UTILITIES
// ============================================================================

/**
 * Standard Puppeteer browser configuration
 * Eliminates duplicate browser setup patterns
 */
export interface BrowserConfig {
  slowMo?: number;
  headless?: boolean;
  devtools?: boolean;
}

/**
 * Creates a standardized Puppeteer browser instance (Deno-compatible)
 */
export async function createBrowser(config: BrowserConfig = {}) {
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    slowMo: config.slowMo || 200,
    headless: config.headless !== false, // default to headless
    devtools: config.devtools || false,
    // Prevent Puppeteer from trying to clean up temp directories with Node.js fs API
    ignoreDefaultArgs: ['--disable-dev-shm-usage'],
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates command line arguments with standardized error handling
 */
export function validateArgs(args: string[], minArgs: number, usage: string): void {
  if (args.length < minArgs) { // Deno args don't include node and script name
    console.error(`Usage: ${usage}`);
    Deno.exit(1);
  }
}

/**
 * Extracts and validates tweet ID from command line args
 */
export function extractTweetId(args: string[]): string {
  const tweetId = args[0]; // Deno args start from index 0
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    throw new Error('Invalid tweet ID. Must be a numeric string.');
  }
  return tweetId;
}

/**
 * Extracts tweet content from command line args (handles spaces)
 */
export function extractTweetContent(args: string[]): string {
  return args.slice(1).join(' '); // Deno args start from index 0
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Escapes CSV content properly
 */
export function escapeCsvContent(content: string): string {
  return `"${content.replace(/"/g, '""')}"`;
}

/**
 * Formats CSV row
 */
export function formatCsvRow(columns: string[]): string {
  return columns.join(',');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Standardized error handler for scripts
 */
export function handleScriptError(error: unknown, logger: { error: (message: string) => void }, context: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`${context}: ${errorMessage}`);
  Deno.exit(1);
}

/**
 * Async wrapper with standardized error handling
 */
export async function runWithErrorHandling<T>(
  operation: () => Promise<T>,
  logger: { error: (message: string) => void },
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleScriptError(error, logger, context);
  }
}