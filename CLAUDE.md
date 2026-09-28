# CLAUDE.md

Guidance for Claude Code in this repository. Read README.md first: it describes the architecture and commands.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run check` — typecheck + lint + tests (must pass before finishing any change)
- `npm test` — vitest
- `npm run db:migrate` — apply pending schema migrations to `data/turrero.db`
- `npm run ebook` — build `public/ebook/el-turrero-post.epub` (generated, not versioned; `npm run build` runs it first). `lib/ebook.ts` builds the EPUB 3, `scripts/build-ebook.ts` processes images with sharp
- `npm run turra:add -- <url|id>` — import a turra from the X API and enrich it with OpenAI
- `npm run turra:discover -- [--add]` — find (and import) the author's Saturday turras newer than the latest archived one
- `npm run turra:sync -- <id> [--delete-missing]`, `npm run turra:enrich -- <id>`, `npm run turra:export-obsidian -- --out <dir>`

When the user writes "add thread <id or url> …" or "añade la turra …", run `npm run turra:add -- <id or url>`.

## Architecture in one paragraph

`data/turrero.db` (SQLite, versioned in git) is the single source of truth. Pages read it at build time through `lib/queries.ts` (`getDb()` is a read-only connection); only `/api/search` (FTS5) and `/api/tweet-video` run at request time. Writes go through `lib/store.ts` and are orchestrated by `lib/ingest.ts`. `lib/x.ts` talks to the X API v2 with plain fetch and normalizes responses into the domain types of `lib/types.ts`; `lib/ai.ts` enriches with OpenAI structured outputs. Editorial constants (site name, featured author, book categories) live in `lib/site.ts`.

## Rules

- Never edit `data/turrero.db` by hand; use the `turra:*` commands or add a migration in `data/migrations/NNNN_name.sql` (applied by `migrate()` in `lib/db.ts`, versioned with `PRAGMA user_version`).
- Schema changes: new migration file + update `lib/types.ts`, `lib/store.ts`, `lib/queries.ts` and tests together.
- Tests must not call X or OpenAI; use the fixtures in `tests/fixtures/` and fake clients.
- X and OpenAI are paid per request: keep responses going through `lib/cache.ts` (`.cache/api/`) so the same request is never paid twice.
- `node:sqlite` is used directly (no ORM). IDs are TEXT (X snowflakes exceed JS safe integers).
- Client components must not import `lib/queries.ts`, `lib/db.ts` or anything that imports `node:sqlite`; share types via `lib/types.ts`.
- Strict TypeScript (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`): prefer `| null` over optional fields in domain types.
- Categories come from a reviewed process in `data/categorization/` (see README "Contenido editorial"). Do not add, rename or reassign categories ad hoc: update `taxonomy.json`/`assignments.json`, generate a migration with `scripts/categorize-migration.ts`, and add retired slugs to `LEGACY_CATEGORY_URLS` in `lib/site.ts`.
- Never commit or push; the user makes all commits.
