/**
 * Local AI enrichment script using Ollama
 *
 * Generates summary, categories, and exam for a thread using a local Ollama model.
 * Replaces the manual generate_prompts.sh + ai-prompt-processor workflow.
 *
 * Usage: deno task ai-local <threadId>
 * Config: OLLAMA_MODEL env var (default: llama3.2)
 */

import dotenv from 'dotenv';
import { getScriptDirectory, createScriptLogger, runWithErrorHandling } from './libs/common-utils.ts';
import { createDataAccess } from './libs/data-access.ts';
import type { Tweet, TweetSummary, CategorizedTweet, TweetExam, QuizQuestion } from '../infrastructure/types/index.ts';

dotenv.config();

// ============================================================================
// CONSTANTS
// ============================================================================

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';
const MAX_RETRIES = 2;

const VALID_CATEGORIES = [
  'resolución-de-problemas-complejos',
  'sistemas-complejos',
  'marketing',
  'estrategia',
  'factor-x',
  'sociología',
  'gestión-del-talento',
  'leyes-y-sesgos',
  'trabajo-en-equipo',
  'libros',
  'futurismo-de-frontera',
  'personotecnia',
  'orquestación-cognitiva',
  'gaming',
  'lectura-de-señales',
  'el-contexto-manda',
  'desarrollo-de-habilidades',
  'otras-turras-del-querer',
] as const;

// ============================================================================
// CLI
// ============================================================================

function parseCliArgs(): string {
  const threadId = Deno.args[0];
  if (!threadId || !/^\d+$/.test(threadId)) {
    console.error('Usage: deno task ai-local <threadId>');
    console.error('  threadId must be a numeric string');
    Deno.exit(1);
  }
  return threadId;
}

// ============================================================================
// OLLAMA
// ============================================================================

async function checkOllamaRunning(): Promise<void> {
  try {
    const res = await fetch(OLLAMA_BASE_URL);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    await res.text();
  } catch {
    console.error(`Error: Ollama is not running at ${OLLAMA_BASE_URL}`);
    console.error('Start it with: ollama serve');
    Deno.exit(1);
  }
}

function getModel(): string {
  return Deno.env.get('OLLAMA_MODEL') || DEFAULT_MODEL;
}

async function ollamaGenerate(model: string, prompt: string, system?: string): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
  };
  if (system) {
    body['system'] = system;
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${text}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const response = typeof data['response'] === 'string' ? data['response'] : '';

  console.log('[DEBUG] Ollama status:', res.status);
  console.log('[DEBUG] Ollama response length:', response.length);
  console.log('[DEBUG] Ollama response (first 500 chars):', JSON.stringify(response.slice(0, 500)));
  if (data['total_duration']) {
    console.log('[DEBUG] Ollama total_duration:', data['total_duration']);
  }

  return response;
}

const SYSTEM_PROMPT = 'You are a JSON-only assistant. You MUST respond with valid JSON and nothing else. No explanations, no markdown, no text before or after the JSON.';

async function callOllama(model: string, prompt: string, logger: ReturnType<typeof createScriptLogger>): Promise<string> {
  let lastRaw = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentPrompt = attempt === 0
        ? prompt
        : `Your previous response was not valid JSON. Here is what you returned:\n${lastRaw.slice(0, 500)}\n\nPlease try again. ${prompt}`;

      lastRaw = await ollamaGenerate(model, currentPrompt, SYSTEM_PROMPT);
      return extractJson(lastRaw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_RETRIES) {
        logger.warn(`Attempt ${attempt + 1} failed: ${msg} — retrying...`);
      } else {
        throw new Error(msg);
      }
    }
  }

  throw new Error('callOllama failed');
}

// ============================================================================
// JSON EXTRACTION
// ============================================================================

function extractJson(raw: string): string {
  // Try parsing directly first
  try {
    JSON.parse(raw);
    return raw;
  } catch { /* continue */ }

  // Find the first {...} block (handles models that wrap JSON in text)
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch { /* continue */ }
  }

  throw new Error(`No valid JSON found in response. Raw output (first 200 chars): ${raw.slice(0, 200)}`);
}

// ============================================================================
// THREAD TEXT EXTRACTION
// ============================================================================

function extractThreadText(tweets: Tweet[][], threadId: string): string {
  const thread = tweets.find((t) => t.some((tweet) => tweet.id === threadId));
  if (!thread) {
    throw new Error(`Thread ${threadId} not found in tweets.json`);
  }
  return thread.map((tweet) => tweet.tweet).join('\n');
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildSummaryPrompt(threadId: string, text: string): string {
  return `Create a short headline from the following text. Write the headline in Spanish. Never use these words: turras, hoy, hilo.

Respond ONLY with this JSON, no other text:
{"id": "${threadId}", "summary": "your headline here"}

Text:
${text}`;
}

function buildMapPrompt(threadId: string, text: string): string {
  return `Categorize the following text. Pick between 1 and 5 categories from this list:
${VALID_CATEGORIES.join(', ')}

Respond ONLY with this JSON, no other text:
{"id": "${threadId}", "categories": "cat1,cat2,cat3"}

Text:
${text}`;
}

function buildExamPrompt(threadId: string, text: string): string {
  return `Create a multiple choice exam from the following text. Write in Spanish. Maximum 3 questions, each with exactly 3 short options.

Respond ONLY with this JSON, no other text:
{"id": "${threadId}", "questions": [{"question": "pregunta", "options": ["a", "b", "c"], "answer": 1}]}

"answer" is the 1-based index of the correct option (1, 2, or 3).

Text:
${text}`;
}

// ============================================================================
// RESPONSE VALIDATORS
// ============================================================================

function validateSummaryResponse(raw: string, threadId: string): TweetSummary {
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (typeof parsed['summary'] !== 'string' || !parsed['summary']) {
    throw new Error('Invalid summary response: missing "summary" field');
  }
  return { id: threadId, summary: parsed['summary'] as string };
}

function validateMapResponse(raw: string, threadId: string): CategorizedTweet {
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (typeof parsed['categories'] !== 'string' || !parsed['categories']) {
    throw new Error('Invalid map response: missing "categories" field');
  }

  const cats = (parsed['categories'] as string)
    .split(',')
    .map((c) => c.trim())
    .filter((c) => (VALID_CATEGORIES as readonly string[]).includes(c))
    .slice(0, 5);

  if (cats.length === 0) {
    throw new Error('No valid categories found in response');
  }

  return { id: threadId, categories: cats.join(',') };
}

function validateExamResponse(raw: string, threadId: string): TweetExam {
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const questions = parsed['questions'];
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Invalid exam response: missing or empty "questions" array');
  }

  const validated: QuizQuestion[] = (questions as Record<string, unknown>[])
    .slice(0, 3)
    .map((q) => {
      if (typeof q['question'] !== 'string') throw new Error('Invalid question text');
      if (!Array.isArray(q['options']) || q['options'].length < 2) throw new Error('Invalid options');
      const answer = Number(q['answer']);
      if (!Number.isInteger(answer) || answer < 1 || answer > (q['options'] as unknown[]).length) {
        throw new Error(`Invalid answer index: ${q['answer']}`);
      }
      return {
        question: q['question'] as string,
        options: (q['options'] as unknown[]).slice(0, 3).map(String),
        answer,
      };
    });

  return { id: threadId, questions: validated };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const logger = createScriptLogger('ai-local');
  const threadId = parseCliArgs();
  const model = getModel();

  logger.info(`Processing thread ${threadId} with model "${model}"`);

  await checkOllamaRunning();

  const scriptDir = getScriptDirectory(import.meta.url);
  const dataAccess = createDataAccess(scriptDir);

  // Load data
  const [tweets, summaries, map, exams] = await Promise.all([
    dataAccess.getTweets(),
    dataAccess.getTweetsSummary(),
    dataAccess.getTweetsMap(),
    dataAccess.getTweetsExam(),
  ]);

  // Extract thread text
  const threadText = extractThreadText(tweets, threadId);
  logger.info(`Extracted ${threadText.length} chars from thread`);

  // --- Summary ---
  if (summaries.some((s) => s.id === threadId)) {
    logger.info('Summary already exists — skipping');
  } else {
    logger.info('Generating summary...');
    const rawSummary = await callOllama(model, buildSummaryPrompt(threadId, threadText), logger);
    const summary = validateSummaryResponse(rawSummary, threadId);
    summaries.push(summary);
    await dataAccess.saveTweetsSummary(summaries);
    logger.info(`Summary saved: "${summary.summary}"`);
  }

  // --- Categories ---
  if (map.some((m) => m.id === threadId)) {
    logger.info('Categories already exist — skipping');
  } else {
    logger.info('Generating categories...');
    const rawMap = await callOllama(model, buildMapPrompt(threadId, threadText), logger);
    const categorized = validateMapResponse(rawMap, threadId);
    map.push(categorized);
    await dataAccess.saveTweetsMap(map);
    logger.info(`Categories saved: "${categorized.categories}"`);
  }

  // --- Exam ---
  if (exams.some((e) => e.id === threadId)) {
    logger.info('Exam already exists — skipping');
  } else {
    logger.info('Generating exam...');
    const rawExam = await callOllama(model, buildExamPrompt(threadId, threadText), logger);
    const exam = validateExamResponse(rawExam, threadId);
    exams.push(exam);
    await dataAccess.saveTweetsExam(exams);
    logger.info(`Exam saved: ${exam.questions.length} questions`);
  }

  logger.info('Done!');
}

await runWithErrorHandling(main, createScriptLogger('ai-local'), 'local-ai-enrichment');
