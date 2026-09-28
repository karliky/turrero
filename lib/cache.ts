// On-disk cache of paid API responses (X, OpenAI), so the same request is never paid twice.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_CACHE_DIR = join(process.cwd(), '.cache', 'api');

export interface ResponseCache {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
}

/**
 * One JSON file per request, named by the hash of the key (URL or request body; never credentials).
 * With refresh, reads always miss but fresh responses are still stored.
 */
export function createFileCache(dir: string = DEFAULT_CACHE_DIR, { refresh = false } = {}): ResponseCache {
  const fileFor = (key: string) => join(dir, `${createHash('sha256').update(key).digest('hex')}.json`);
  return {
    read(key) {
      if (refresh) return undefined;
      try {
        return (JSON.parse(readFileSync(fileFor(key), 'utf8')) as { value: unknown }).value;
      } catch {
        return undefined;
      }
    },
    write(key, value) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(fileFor(key), JSON.stringify({ key, savedAt: new Date().toISOString(), value }));
    },
  };
}
