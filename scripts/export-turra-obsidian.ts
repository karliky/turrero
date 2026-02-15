import { join } from "@std/path";
import dotenv from "dotenv";
import {
  createScriptLogger,
  getProjectRoot,
  getScriptDirectory,
  readJsonFile,
  runWithErrorHandling,
} from "./libs/common-utils.ts";
import { normalizeId } from "../infrastructure/utils/id-utils.ts";

interface Tweet {
  id: string;
  tweet: string;
  author: string;
  authorName?: string;
  time: string;
}

interface TweetSummary {
  id: string;
  summary: string;
}

interface TweetMapEntry {
  id: string;
  categories: string;
}

interface EnrichedTweetData {
  id: string;
  type: string;
  domain?: string;
  title?: string;
  description?: string;
  url?: string;
}

interface ExportOptions {
  id: string;
  outDir: string;
  overwrite: boolean;
  stdout: boolean;
  withAiKeyIdeas: boolean;
  aiModel: string;
  ollamaUrl: string;
  keyIdeasCount: number;
}

const logger = createScriptLogger("export-obsidian");
const scriptDir = getScriptDirectory(import.meta.url);
const projectRoot = getProjectRoot(scriptDir);
const OLLAMA_BASE_URL_DEFAULT = "http://localhost:11434";
const OLLAMA_DEFAULT_MODEL = "llama3.2";
const AI_KEY_IDEAS_MAX_ATTEMPTS = 3;
const AI_KEY_IDEAS_MAX_INPUT_CHARS = 12000;
const AI_KEY_IDEAS_RETRY_INPUT_CHARS = 6000;

dotenv.config();

function getEnvVar(name: string): string | undefined {
  const fromDeno = Deno.env.get(name);
  if (fromDeno?.trim()) return fromDeno.trim();

  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();

  return undefined;
}

function printUsageAndExit(): never {
  console.log(
    "Usage: deno task export-obsidian --id <tweet_or_thread_id> [--out <dir>] [--overwrite] [--stdout] [--with-key-ideas-ai] [--key-ideas-model <model>] [--ollama-url <url>] [--key-ideas-count <n>]",
  );
  Deno.exit(1);
}

function parseArgs(args: string[]): ExportOptions {
  let id = "";
  let outDir = join(projectRoot, "exports/obsidian");
  let overwrite = false;
  let stdout = false;
  let withAiKeyIdeas = false;
  let aiModel = getEnvVar("OLLAMA_MODEL") || OLLAMA_DEFAULT_MODEL;
  let ollamaUrl = getEnvVar("OLLAMA_BASE_URL") || OLLAMA_BASE_URL_DEFAULT;
  let keyIdeasCount = 5;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--") continue;

    if (arg === "--help" || arg === "-h") {
      printUsageAndExit();
    }

    if (arg.startsWith("--id=")) {
      id = arg.slice("--id=".length).trim();
      continue;
    }

    if (arg === "--id") {
      id = args[i + 1] || "";
      i++;
      continue;
    }

    if (arg.startsWith("--out=")) {
      const fromArg = arg.slice("--out=".length).trim();
      if (fromArg) outDir = fromArg;
      continue;
    }

    if (arg === "--out") {
      outDir = args[i + 1] || outDir;
      i++;
      continue;
    }

    if (arg === "--overwrite") {
      overwrite = true;
      continue;
    }

    if (arg === "--stdout") {
      stdout = true;
      continue;
    }

    if (arg === "--with-key-ideas-ai") {
      withAiKeyIdeas = true;
      continue;
    }

    if (arg.startsWith("--key-ideas-model=")) {
      const fromArg = arg.slice("--key-ideas-model=".length).trim();
      if (fromArg) aiModel = fromArg;
      continue;
    }

    if (arg === "--key-ideas-model") {
      const fromArg = (args[i + 1] || "").trim();
      if (fromArg) aiModel = fromArg;
      i++;
      continue;
    }

    if (arg.startsWith("--ollama-url=")) {
      const fromArg = arg.slice("--ollama-url=".length).trim();
      if (fromArg) ollamaUrl = fromArg;
      continue;
    }

    if (arg === "--ollama-url") {
      const fromArg = (args[i + 1] || "").trim();
      if (fromArg) ollamaUrl = fromArg;
      i++;
      continue;
    }

    if (arg.startsWith("--key-ideas-count=")) {
      const fromArg = Number(arg.slice("--key-ideas-count=".length).trim());
      if (Number.isInteger(fromArg) && fromArg > 0 && fromArg <= 15) keyIdeasCount = fromArg;
      continue;
    }

    if (arg === "--key-ideas-count") {
      const fromArg = Number((args[i + 1] || "").trim());
      if (Number.isInteger(fromArg) && fromArg > 0 && fromArg <= 15) keyIdeasCount = fromArg;
      i++;
      continue;
    }

    // Positional fallback for convenience
    if (!arg.startsWith("-") && !id) {
      id = arg;
    }
  }

  if (!id) {
    printUsageAndExit();
  }

  return {
    id,
    outDir,
    overwrite,
    stdout,
    withAiKeyIdeas,
    aiModel,
    ollamaUrl,
    keyIdeasCount,
  };
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripTweetPrefix(text: string): string {
  return cleanText(text).replace(/^\d+\/\s*/, "");
}

function toSlug(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "turra";
}

function toSnakeCase(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function authorHandleFromAuthorField(author: string): string {
  const cleaned = author.trim();
  const atMatch = cleaned.match(/^@([A-Za-z0-9_]+)/);
  if (atMatch?.[1]) return atMatch[1];

  try {
    const parsed = new URL(cleaned);
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle || "unknown";
  } catch {
    return cleaned.replace(/^@/, "") || "unknown";
  }
}

function formatNowForFrontmatter(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function quoteYaml(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function resolveThread(
  threads: Tweet[][],
  inputId: string,
): { threadId: string; thread: Tweet[] } {
  const normalizedInput = normalizeId(inputId);
  const candidates = new Set<string>([inputId, normalizedInput]);

  if (normalizedInput.includes("#")) {
    const [threadPart, tweetPart] = normalizedInput.split("#");
    if (threadPart) candidates.add(threadPart);
    if (tweetPart) candidates.add(tweetPart);
  }

  for (const thread of threads) {
    const first = thread[0];
    if (!first) continue;

    if (candidates.has(first.id)) {
      return { threadId: first.id, thread };
    }

    if (thread.some((tweet) => candidates.has(tweet.id))) {
      return { threadId: first.id, thread };
    }
  }

  throw new Error(`Thread not found for id: ${inputId}`);
}

function uniqueCardLinks(entries: EnrichedTweetData[]): EnrichedTweetData[] {
  const seen = new Set<string>();
  const result: EnrichedTweetData[] = [];

  for (const entry of entries) {
    if (entry.type !== "card") continue;
    const key = entry.url?.trim() || `${entry.domain || ""}::${entry.title || ""}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }

  return result;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue with fallback extraction
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match?.[0]) {
    try {
      const parsed = JSON.parse(match[0]) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Continue to final error
    }
  }

  throw new Error("Could not parse JSON object from Ollama response");
}

function buildThreadTextForAi(thread: Tweet[], maxChars: number): string {
  const lines = thread
    .map((tweet, i) => {
      const text = cleanText(stripTweetPrefix(tweet.tweet))
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return text ? `${i + 1}. ${text}` : "";
    })
    .filter(Boolean);

  const joined = lines.join("\n");
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars)}\n[...contenido truncado para ajuste de contexto...]`;
}

function buildKeyIdeasPrompt(params: {
  count: number;
  threadId: string;
  title: string;
  threadText: string;
}): string {
  const { count, threadId, title, threadText } = params;
  return `Actúa como editor de conocimiento para un zettelkasten: extrae ideas nucleares, no obvias y reutilizables del hilo, evitando lugares comunes.
Extrae ${count} ideas clave accionables del siguiente hilo.
Responde SOLO en JSON válido con este formato exacto:
{"key_ideas":["idea 1","idea 2"]}

Reglas:
- Idioma: español
- Cada idea en una sola frase, clara y concreta
- No copiar texto literal largo del hilo
- Sin hashtags ni menciones
- Máximo 160 caracteres por idea

Thread ID: ${threadId}
Título: ${title}

Hilo:
${threadText}`;
}

function extractRawTextFromOllamaPayload(payload: Record<string, unknown>): string {
  const response = payload.response;
  if (typeof response === "string" && response.trim()) return response;

  const outputText = payload.output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText;

  const content = payload.content;
  if (typeof content === "string" && content.trim()) return content;

  const message = payload.message;
  if (message && typeof message === "object") {
    const msg = message as Record<string, unknown>;
    const msgContent = msg.content;
    if (typeof msgContent === "string" && msgContent.trim()) {
      return msgContent;
    }
    if (Array.isArray(msgContent)) {
      const combined = msgContent
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            if (typeof obj.text === "string") return obj.text;
            if (typeof obj.content === "string") return obj.content;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
      if (combined) return combined;
    }
  }

  const responses = payload.responses;
  if (Array.isArray(responses)) {
    const combined = responses
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("\n")
      .trim();
    if (combined) return combined;
  }

  return "";
}

function buildAiRequestBody(params: {
  model: string;
  prompt: string;
  count: number;
  strategy: number;
}): Record<string, unknown> {
  const { model, prompt, count, strategy } = params;

  const base: Record<string, unknown> = {
    model,
    prompt,
    stream: false,
    system:
      "Eres un asistente que devuelve SOLO JSON válido sin texto adicional.",
    options: { temperature: 0 },
  };

  if (strategy === 0) {
    base.format = {
      type: "object",
      properties: {
        key_ideas: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: count,
        },
      },
      required: ["key_ideas"],
      additionalProperties: false,
    };
  } else if (strategy === 1) {
    base.format = "json";
  }

  return base;
}

async function generateAiKeyIdeas(params: {
  threadId: string;
  title: string;
  thread: Tweet[];
  model: string;
  baseUrl: string;
  count: number;
}): Promise<string[]> {
  const { threadId, title, thread, model, baseUrl, count } = params;
  const fullThreadText = buildThreadTextForAi(thread, AI_KEY_IDEAS_MAX_INPUT_CHARS);
  const retryThreadText = buildThreadTextForAi(thread, AI_KEY_IDEAS_RETRY_INPUT_CHARS);
  const basePrompt = buildKeyIdeasPrompt({
    count,
    threadId,
    title,
    threadText: fullThreadText,
  });

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/generate`;
  let currentPrompt = basePrompt;
  let lastRaw = "";
  let lastParseError = "";

  for (let attempt = 1; attempt <= AI_KEY_IDEAS_MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      const strategy = Math.min(attempt - 1, 2);
      const requestBody = buildAiRequestBody({
        model,
        prompt: currentPrompt,
        count,
        strategy,
      });

      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not reach local AI at ${endpoint}. ` +
          `Run without --with-key-ideas-ai or start Ollama (ollama serve). ` +
          `Original error: ${message}`,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama error (${response.status}): ${body}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const raw = extractRawTextFromOllamaPayload(payload);
    if (!raw.trim()) {
      const doneReason = typeof payload.done_reason === "string" ? payload.done_reason : "unknown";
      const payloadKeys = Object.keys(payload).join(",") || "none";
      lastParseError =
        `Ollama returned an empty response (done_reason=${doneReason}, keys=${payloadKeys})`;
    } else {
      lastRaw = raw;
      try {
        const parsed = extractJsonObject(raw);
        const rawIdeas = Array.isArray(parsed.key_ideas) ? parsed.key_ideas : [];

        const ideas = rawIdeas
          .filter((value): value is string => typeof value === "string")
          .map((value) => cleanText(value).replace(/^[-*]\s*/, ""))
          .filter(Boolean)
          .filter((value, index, arr) => arr.indexOf(value) === index)
          .slice(0, count);

        if (ideas.length > 0) {
          return ideas;
        }
        lastParseError = "No valid key ideas were returned by Ollama";
      } catch (error) {
        lastParseError = error instanceof Error ? error.message : String(error);
      }
    }

    if (attempt < AI_KEY_IDEAS_MAX_ATTEMPTS) {
      logger.warn(
        `AI key ideas attempt ${attempt}/${AI_KEY_IDEAS_MAX_ATTEMPTS} failed: ${lastParseError}. Retrying...`,
      );
      currentPrompt = `${buildKeyIdeasPrompt({
        count,
        threadId,
        title,
        threadText: retryThreadText,
      })}

Tu respuesta anterior no fue JSON válido o no cumplió el esquema.
Devuelve SOLO JSON válido con esta estructura exacta:
{"key_ideas":["idea 1","idea 2"]}

No incluyas markdown, comentarios ni texto adicional. Si dudas, devuelve un array con al menos 1 idea.
Respuesta anterior (corrígela): ${lastRaw.slice(0, 1200)}
`;
    }
  }

  throw new Error(
    `Could not parse valid AI key ideas after ${AI_KEY_IDEAS_MAX_ATTEMPTS} attempts. Last error: ${lastParseError}`,
  );
}

function buildMarkdown(params: {
  threadId: string;
  thread: Tweet[];
  titleOverride?: string;
  keyIdeas?: string[];
  categories: string[];
  cardLinks: EnrichedTweetData[];
}): { markdown: string; title: string } {
  const { threadId, thread, titleOverride, keyIdeas, categories, cardLinks } = params;
  const first = thread[0];
  if (!first) throw new Error(`Thread ${threadId} has no tweets`);

  const authorHandle = authorHandleFromAuthorField(first.author);
  const authorX = `@${authorHandle}`;
  const sourceUrl = `https://x.com/${authorHandle}/status/${threadId}`;
  const fallbackTitle = stripTweetPrefix(first.tweet).slice(0, 120);
  const title = cleanText(titleOverride || fallbackTitle || `Turra ${threadId}`);

  const tags = [
    "atom",
    "turras",
    ...categories.map(toSnakeCase).filter(Boolean),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const lines: string[] = [];
  lines.push("---");
  lines.push("type: atom");
  lines.push(`created: ${formatNowForFrontmatter(new Date())}`);
  lines.push(`source: ${quoteYaml(sourceUrl)}`);
  lines.push(`thread_id: ${quoteYaml(threadId)}`);
  lines.push(`author_x: ${quoteYaml(authorX)}`);
  if (first.authorName?.trim()) {
    lines.push(`author_name: ${quoteYaml(cleanText(first.authorName))}`);
  }
  lines.push("tags:");
  for (const tag of tags) {
    lines.push(`  - ${tag}`);
  }
  lines.push("---");
  lines.push("");

  lines.push(`# ${title}`);
  lines.push("");

  if (keyIdeas && keyIdeas.length > 0) {
    lines.push("## Key Ideas");
    for (const idea of keyIdeas) {
      lines.push(`- ${idea}`);
    }
    lines.push("");
  }

  lines.push("## Thread");
  thread.forEach((tweet, index) => {
    const text = cleanText(tweet.tweet);
    const url = `https://x.com/${authorHandle}/status/${tweet.id}`;
    lines.push(`${index + 1}. ${text}`);
    lines.push(`   - Source: [${tweet.id}](${url})`);
  });
  lines.push("");

  lines.push("## Links / Cards");
  if (cardLinks.length === 0) {
    lines.push("- No link cards found in this thread.");
  } else {
    for (const card of cardLinks) {
      const label = cleanText(card.title || card.domain || card.url || "Link");
      const url = card.url?.trim() || "";
      const domain = cleanText(card.domain || "");
      const description = cleanText(card.description || "");

      if (url) {
        lines.push(`- [${label}](${url})`);
      } else {
        lines.push(`- ${label}`);
      }
      if (domain) lines.push(`  - domain: ${domain}`);
      if (description) lines.push(`  - description: ${description}`);
    }
  }
  lines.push("");

  lines.push("## Tags / Context");
  if (categories.length === 0) {
    lines.push("- [[turras]]");
  } else {
    for (const category of categories) {
      lines.push(`- [[${cleanText(category)}]]`);
    }
  }
  lines.push("");

  return {
    markdown: lines.join("\n"),
    title,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(Deno.args);

  const tweetsPath = join(projectRoot, "infrastructure/db/tweets.json");
  const summariesPath = join(projectRoot, "infrastructure/db/tweets_summary.json");
  const mapPath = join(projectRoot, "infrastructure/db/tweets_map.json");
  const enrichedPath = join(projectRoot, "infrastructure/db/tweets_enriched.json");

  const [threads, summaries, mapEntries, enrichments] = await Promise.all([
    readJsonFile<Tweet[][]>(tweetsPath),
    readJsonFile<TweetSummary[]>(summariesPath),
    readJsonFile<TweetMapEntry[]>(mapPath),
    readJsonFile<EnrichedTweetData[]>(enrichedPath),
  ]);

  const { threadId, thread } = resolveThread(threads, options.id);
  const summaryTitle = summaries.find((entry) => normalizeId(entry.id) === normalizeId(threadId))
    ?.summary;

  const categoriesRaw =
    mapEntries.find((entry) => normalizeId(entry.id) === normalizeId(threadId))?.categories || "";
  const categories = categoriesRaw
    .split(",")
    .map((value) => cleanText(value))
    .filter(Boolean);

  const threadTweetIds = new Set(thread.map((tweet) => tweet.id));
  const threadEnrichments = enrichments.filter((entry) => threadTweetIds.has(entry.id));
  const cardLinks = uniqueCardLinks(threadEnrichments);

  const markdownInput: {
    threadId: string;
    thread: Tweet[];
    titleOverride?: string;
    keyIdeas?: string[];
    categories: string[];
    cardLinks: EnrichedTweetData[];
  } = {
    threadId,
    thread,
    categories,
    cardLinks,
  };
  if (summaryTitle?.trim()) {
    markdownInput.titleOverride = summaryTitle.trim();
  }

  if (options.withAiKeyIdeas) {
    const titleForPrompt = summaryTitle?.trim() || stripTweetPrefix(thread[0]?.tweet || "");
    logger.info(
      `Generating ${options.keyIdeasCount} AI key ideas with model ${options.aiModel}...`,
    );
    markdownInput.keyIdeas = await generateAiKeyIdeas({
      threadId,
      title: titleForPrompt,
      thread,
      model: options.aiModel,
      baseUrl: options.ollamaUrl,
      count: options.keyIdeasCount,
    });
  }

  const { markdown, title } = buildMarkdown(markdownInput);

  const fileName = `${threadId}-${toSlug(title)}.md`;

  if (options.stdout) {
    console.log(markdown);
    logger.info(`Rendered markdown for ${threadId} (${fileName}) to stdout`);
    return;
  }

  await Deno.mkdir(options.outDir, { recursive: true });
  const filePath = join(options.outDir, fileName);

  if (!options.overwrite) {
    try {
      await Deno.stat(filePath);
      throw new Error(`File already exists: ${filePath} (use --overwrite to replace)`);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  await Deno.writeTextFile(filePath, markdown);
  logger.info(`Exported thread ${threadId} to ${filePath}`);
}

runWithErrorHandling(main, logger, "Exporting turra to Obsidian markdown");
