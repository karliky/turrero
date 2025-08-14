/**
 * Common utilities shared across scripts to eliminate code duplication
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../../infrastructure/logger.js';

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Gets the directory path for ES modules
 * Replaces duplicate __filename and __dirname patterns
 */
export function getScriptDirectory(importMetaUrl: string): string {
  const __filename = fileURLToPath(importMetaUrl);
  return dirname(__filename);
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
  return createLogger({ prefix: scriptName });
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Safely reads a JSON file with error handling
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
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
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

/**
 * Safely reads a CSV file
 */
export async function readCsvFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read CSV file ${filePath}: ${error}`);
  }
}

/**
 * Safely writes a CSV file
 */
export async function writeCsvFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf8');
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
 * Creates a standardized Puppeteer browser instance
 */
export async function createBrowser(config: BrowserConfig = {}) {
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    slowMo: config.slowMo || 200,
    headless: config.headless !== false, // default to headless
    devtools: config.devtools || false,
  });
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates command line arguments with standardized error handling
 */
export function validateArgs(args: string[], minArgs: number, usage: string): void {
  if (args.length < minArgs + 2) { // +2 for node and script name
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
}

/**
 * Extracts and validates tweet ID from command line args
 */
export function extractTweetId(args: string[]): string {
  const tweetId = args[2];
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    throw new Error('Invalid tweet ID. Must be a numeric string.');
  }
  return tweetId;
}

/**
 * Extracts tweet content from command line args (handles spaces)
 */
export function extractTweetContent(args: string[]): string {
  return args.slice(3).join(' ');
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
  process.exit(1);
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