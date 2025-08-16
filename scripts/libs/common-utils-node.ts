/**
 * Common utilities shared across Node.js scripts to eliminate code duplication
 * Node.js compatible version of common-utils.ts
 */

import { dirname, join } from 'path';
import { readFile, writeFile } from 'fs/promises';
// Simple logger for Node.js compatibility
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

function createSimpleLogger(prefix?: string): Logger {
  const p = prefix ? `[${prefix}]` : '';
  return {
    debug: (message: string, ...args: unknown[]) => console.log(`DEBUG${p} ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => console.log(`INFO${p} ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => console.warn(`WARN${p} ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => console.error(`ERROR${p} ${message}`, ...args),
  };
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Gets the directory path for ES modules (Node.js compatible)
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
 * Creates a standardized logger with script prefix (Node.js compatible)
 */
export function createScriptLogger(scriptName: string) {
  return createSimpleLogger(scriptName);
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Safely reads a JSON file with error handling (Node.js compatible)
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
  }
}

/**
 * Safely writes a JSON file with error handling and formatting (Node.js compatible)
 */
export async function writeJsonFile<T = unknown>(filePath: string, data: T): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 4);
    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

/**
 * Safely reads a CSV file (Node.js compatible)
 */
export async function readCsvFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read CSV file ${filePath}: ${error}`);
  }
}

/**
 * Safely writes a CSV file (Node.js compatible)
 */
export async function writeCsvFile(filePath: string, content: string): Promise<void> {
  try {
    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write CSV file ${filePath}: ${error}`);
  }
}

// ============================================================================
// BROWSER UTILITIES
// ============================================================================

/**
 * Standard Puppeteer browser configuration
 */
export interface BrowserConfig {
  slowMo?: number;
  headless?: boolean;
  devtools?: boolean;
}

/**
 * Creates a standardized Puppeteer browser instance (Node.js compatible)
 */
export async function createBrowser(config: BrowserConfig = {}) {
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    slowMo: config.slowMo || 200,
    headless: config.headless !== false,
    devtools: config.devtools || false,
  });
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates command line arguments with standardized error handling (Node.js compatible)
 */
export function validateArgs(args: string[], minArgs: number, usage: string): void {
  if (args.length < minArgs + 2) { // Node.js args include node and script name
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
}

/**
 * Extracts and validates tweet ID from command line args (Node.js compatible)
 */
export function extractTweetId(args: string[]): string {
  const tweetId = args[2]; // Node.js args start from index 2 (skip node and script)
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    throw new Error('Invalid tweet ID. Must be a numeric string.');
  }
  return tweetId;
}

/**
 * Extracts tweet content from command line args (Node.js compatible)
 */
export function extractTweetContent(args: string[]): string {
  return args.slice(3).join(' '); // Node.js args start from index 2
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
 * Standardized error handler for scripts (Node.js compatible)
 */
export function handleScriptError(error: unknown, logger: { error: (message: string) => void }, context: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`${context}: ${errorMessage}`);
  process.exit(1);
}

/**
 * Async wrapper with standardized error handling (Node.js compatible)
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