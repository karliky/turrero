import { join } from "@std/path";
import {
  createScriptLogger,
  getProjectRoot,
  getScriptDirectory,
  runWithErrorHandling,
} from "./libs/common-utils.ts";

interface BatchOptions {
  outDir: string;
  overwrite: boolean;
  withAi: boolean;
  keyIdeasCount: number;
  aiModel: string | undefined;
  ollamaUrl: string | undefined;
  onlyFailed: boolean;
  failuresFile: string;
  reportFile: string;
  limit: number | undefined;
  delayMs: number;
}

interface ExportFailure {
  id: string;
  durationMs: number;
  error: string;
}

interface ExportReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  options: {
    outDir: string;
    overwrite: boolean;
    withAi: boolean;
    keyIdeasCount: number;
    aiModel?: string;
    ollamaUrl?: string;
    onlyFailed: boolean;
    failuresFile: string;
    reportFile: string;
    limit?: number;
    delayMs: number;
  };
  totals: {
    requested: number;
    success: number;
    failed: number;
  };
  successfulIds: string[];
  failed: ExportFailure[];
}

const logger = createScriptLogger("export-obsidian-all");
const scriptDir = getScriptDirectory(import.meta.url);
const projectRoot = getProjectRoot(scriptDir);
const exportScriptPath = join(projectRoot, "scripts/export-turra-obsidian.ts");
const turrasCsvPath = join(projectRoot, "infrastructure/db/turras.csv");

function usage(): never {
  console.log(`Usage:
  deno task export-obsidian-all --out <dir> [--overwrite] [--without-ai] [--key-ideas-count <n>] [--key-ideas-model <model>] [--ollama-url <url>] [--only-failed] [--failures-file <path>] [--report-file <path>] [--limit <n>] [--delay-ms <n>]

Examples:
  deno task export-obsidian-all --out "/Users/ajramos/Documents/obsidian/chronicles/02-Atoms/CPS/Turras" --overwrite
  deno task export-obsidian-all --out "/Users/ajramos/Documents/obsidian/chronicles/02-Atoms/CPS/Turras" --only-failed --overwrite
`);
  Deno.exit(1);
}

function parsePositiveInt(value: string, flagName: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid value for ${flagName}: ${value}`);
  }
  return parsed;
}

function parseArgs(args: string[]): BatchOptions {
  let outDir = join(projectRoot, "exports/obsidian");
  let overwrite = false;
  let withAi = true;
  let keyIdeasCount = 5;
  let aiModel: string | undefined;
  let ollamaUrl: string | undefined;
  let onlyFailed = false;
  let failuresFile: string | undefined;
  let reportFile: string | undefined;
  let limit: number | undefined;
  let delayMs = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg || arg === "--") continue;

    if (arg === "--help" || arg === "-h") {
      usage();
    }

    if (arg.startsWith("--out=")) {
      const v = arg.slice("--out=".length).trim();
      if (v) outDir = v;
      continue;
    }
    if (arg === "--out") {
      const v = (args[i + 1] || "").trim();
      if (!v) throw new Error("--out requires a value");
      outDir = v;
      i++;
      continue;
    }

    if (arg === "--overwrite") {
      overwrite = true;
      continue;
    }

    if (arg === "--without-ai") {
      withAi = false;
      continue;
    }

    if (arg.startsWith("--key-ideas-count=")) {
      keyIdeasCount = parsePositiveInt(arg.slice("--key-ideas-count=".length), "--key-ideas-count");
      continue;
    }
    if (arg === "--key-ideas-count") {
      const v = args[i + 1] || "";
      keyIdeasCount = parsePositiveInt(v, "--key-ideas-count");
      i++;
      continue;
    }

    if (arg.startsWith("--key-ideas-model=")) {
      const v = arg.slice("--key-ideas-model=".length).trim();
      if (v) aiModel = v;
      continue;
    }
    if (arg === "--key-ideas-model") {
      const v = (args[i + 1] || "").trim();
      if (!v) throw new Error("--key-ideas-model requires a value");
      aiModel = v;
      i++;
      continue;
    }

    if (arg.startsWith("--ollama-url=")) {
      const v = arg.slice("--ollama-url=".length).trim();
      if (v) ollamaUrl = v;
      continue;
    }
    if (arg === "--ollama-url") {
      const v = (args[i + 1] || "").trim();
      if (!v) throw new Error("--ollama-url requires a value");
      ollamaUrl = v;
      i++;
      continue;
    }

    if (arg === "--only-failed") {
      onlyFailed = true;
      continue;
    }

    if (arg.startsWith("--failures-file=")) {
      const v = arg.slice("--failures-file=".length).trim();
      if (v) failuresFile = v;
      continue;
    }
    if (arg === "--failures-file") {
      const v = (args[i + 1] || "").trim();
      if (!v) throw new Error("--failures-file requires a value");
      failuresFile = v;
      i++;
      continue;
    }

    if (arg.startsWith("--report-file=")) {
      const v = arg.slice("--report-file=".length).trim();
      if (v) reportFile = v;
      continue;
    }
    if (arg === "--report-file") {
      const v = (args[i + 1] || "").trim();
      if (!v) throw new Error("--report-file requires a value");
      reportFile = v;
      i++;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      limit = parsePositiveInt(arg.slice("--limit=".length), "--limit");
      continue;
    }
    if (arg === "--limit") {
      const v = args[i + 1] || "";
      limit = parsePositiveInt(v, "--limit");
      i++;
      continue;
    }

    if (arg.startsWith("--delay-ms=")) {
      delayMs = parsePositiveInt(arg.slice("--delay-ms=".length), "--delay-ms");
      continue;
    }
    if (arg === "--delay-ms") {
      const v = args[i + 1] || "";
      delayMs = parsePositiveInt(v, "--delay-ms");
      i++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (keyIdeasCount < 1 || keyIdeasCount > 15) {
    throw new Error("--key-ideas-count must be between 1 and 15");
  }

  const failuresPath = failuresFile || join(outDir, "_export_obsidian_failed_ids.txt");
  const reportPath = reportFile || join(outDir, "_export_obsidian_report.json");

  return {
    outDir,
    overwrite,
    withAi,
    keyIdeasCount,
    aiModel,
    ollamaUrl,
    onlyFailed,
    failuresFile: failuresPath,
    reportFile: reportPath,
    limit,
    delayMs,
  };
}

function normalizeIdList(ids: string[]): string[] {
  const normalized = ids
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));

  return normalized.filter((id, index, arr) => arr.indexOf(id) === index);
}

async function loadAllTurraIds(): Promise<string[]> {
  const content = await Deno.readTextFile(turrasCsvPath);
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ids = lines
    .slice(1) // skip header
    .map((line) => line.split(",")[0] || "");
  return normalizeIdList(ids);
}

async function loadFailedIds(failuresFile: string): Promise<string[]> {
  try {
    const content = await Deno.readTextFile(failuresFile);
    const ids = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return normalizeIdList(ids);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }
}

async function runSingleExport(
  id: string,
  options: BatchOptions,
): Promise<{ ok: boolean; durationMs: number; error?: string }> {
  const args = [
    "run",
    "--allow-all",
    exportScriptPath,
    "--id",
    id,
    "--out",
    options.outDir,
  ];

  if (options.overwrite) {
    args.push("--overwrite");
  }

  if (options.withAi) {
    args.push("--with-key-ideas-ai");
    args.push("--key-ideas-count", String(options.keyIdeasCount));
    if (options.aiModel) {
      args.push("--key-ideas-model", options.aiModel);
    }
    if (options.ollamaUrl) {
      args.push("--ollama-url", options.ollamaUrl);
    }
  }

  const start = Date.now();
  const command = new Deno.Command(Deno.execPath(), {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const result = await command.output();
  const durationMs = Date.now() - start;

  if (result.code === 0) {
    return { ok: true, durationMs };
  }

  const stderr = new TextDecoder().decode(result.stderr || new Uint8Array());
  const stdout = new TextDecoder().decode(result.stdout || new Uint8Array());
  const fullError = `${stderr}\n${stdout}`.trim();
  const compactError = fullError.length > 3000 ? fullError.slice(-3000) : fullError;

  return {
    ok: false,
    durationMs,
    error: compactError || `Export failed with exit code ${result.code}`,
  };
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRetryCommand(options: BatchOptions): string {
  const parts = [
    "deno task export-obsidian-all",
    `--out \"${options.outDir}\"`,
    "--only-failed",
  ];

  if (options.overwrite) parts.push("--overwrite");
  if (!options.withAi) parts.push("--without-ai");
  if (options.withAi) {
    parts.push(`--key-ideas-count ${options.keyIdeasCount}`);
    if (options.aiModel) parts.push(`--key-ideas-model \"${options.aiModel}\"`);
    if (options.ollamaUrl) parts.push(`--ollama-url \"${options.ollamaUrl}\"`);
  }

  parts.push(`--failures-file \"${options.failuresFile}\"`);
  return parts.join(" ");
}

async function main(): Promise<void> {
  const options = parseArgs(Deno.args);
  await Deno.mkdir(options.outDir, { recursive: true });

  let ids = options.onlyFailed
    ? await loadFailedIds(options.failuresFile)
    : await loadAllTurraIds();

  if (options.limit && options.limit > 0) {
    ids = ids.slice(0, options.limit);
  }

  if (ids.length === 0) {
    logger.info(
      options.onlyFailed
        ? `No failed IDs found at ${options.failuresFile}`
        : "No turras found to export",
    );
    return;
  }

  logger.info(
    `Starting Obsidian batch export for ${ids.length} turras (AI key ideas: ${
      options.withAi ? "on" : "off"
    })`,
  );

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const successfulIds: string[] = [];
  const failed: ExportFailure[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    logger.info(`[${i + 1}/${ids.length}] Exporting ${id}...`);

    const result = await runSingleExport(id, options);
    if (result.ok) {
      successfulIds.push(id);
      logger.info(`[${i + 1}/${ids.length}] OK ${id} (${result.durationMs}ms)`);
    } else {
      failed.push({
        id,
        durationMs: result.durationMs,
        error: result.error || "Unknown error",
      });
      logger.error(`[${i + 1}/${ids.length}] FAIL ${id}: ${result.error}`);
    }

    if (options.delayMs > 0 && i < ids.length - 1) {
      await sleep(options.delayMs);
    }
  }

  const failedIds = failed.map((item) => item.id);
  await Deno.writeTextFile(
    options.failuresFile,
    failedIds.join("\n") + (failedIds.length ? "\n" : ""),
  );

  const report: ExportReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    options: {
      outDir: options.outDir,
      overwrite: options.overwrite,
      withAi: options.withAi,
      keyIdeasCount: options.keyIdeasCount,
      ...(options.aiModel ? { aiModel: options.aiModel } : {}),
      ...(options.ollamaUrl ? { ollamaUrl: options.ollamaUrl } : {}),
      onlyFailed: options.onlyFailed,
      failuresFile: options.failuresFile,
      reportFile: options.reportFile,
      ...(options.limit ? { limit: options.limit } : {}),
      delayMs: options.delayMs,
    },
    totals: {
      requested: ids.length,
      success: successfulIds.length,
      failed: failed.length,
    },
    successfulIds,
    failed,
  };

  await Deno.writeTextFile(options.reportFile, JSON.stringify(report, null, 2));

  logger.info(
    `Batch export finished. Success: ${successfulIds.length}, Failed: ${failed.length}. Report: ${options.reportFile}`,
  );

  if (failed.length > 0) {
    logger.warn(`Failed IDs written to ${options.failuresFile}`);
    logger.warn(`Retry only failed with:`);
    logger.warn(buildRetryCommand(options));
    Deno.exit(2);
  }
}

runWithErrorHandling(main, logger, "Batch exporting turras to Obsidian");
