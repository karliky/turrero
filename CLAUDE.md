# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start Next.js development server (localhost:3000)
- `npm run build` - Build production version
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

### Quality Checks
- `npm run typecheck` - Type check app (`tsconfig.json`) and scripts (`scripts/tsconfig.json`)
- `npm run check` - typecheck + lint + `flows:check` + `schema:validate`
- `npm run schema:validate` / `npm run schema:infer` - Validate / regenerate `artifacts/db-schemas/`
- `npm run flows:check` - Check data flow freshness between DB files

### Data Script Commands (Node.js + tsx)
- `npm run scrape` - Run thread scraping tool
- `npm run enrich` - Run tweet enrichment process
- `npm run books` / `npm run book-enrich` - Generate / enrich book references
- `npm run algolia` - Generate Algolia search database (`tweets-db.json`)
- `npm run graph` - Regenerate graph data (Python)
- `npm run ai-local -- $threadId` - Generate summary, categories, and exam via local Ollama
- `npm run export-obsidian -- --id <thread_or_tweet_id> --out "<folder>"` - Export a turra as Obsidian markdown
- `npm run export-obsidian-all -- --out "<folder>" --overwrite` - Batch export all turras to Obsidian markdown
- `npm run pdf` - Generate PDF/EPUB of all turras
- `npm run podcast -- $threadId` - Generate podcast script via OpenAI
- `./scripts/add_thread.sh $id $first_tweet_line` - Add new thread (automated workflow)

### Testing Individual Tweets
- `npm run scrape -- --test $tweet_id` - Test scraping a single tweet
- `npm run fix-tweet -- <tweet_id...>` - Re-scrape specific tweet IDs for metadata backfill

## Tech Stack & Architecture

### Frontend
- **Next.js 16** with App Router (Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS 4** (theme tokens such as the whiskey palette live in `app/globals.css` under `@theme`)
- Fonts: Geist Sans and Geist Mono

### Data & Infrastructure
- **Single runtime**: Node.js for both the frontend and the data scripts (scripts run with `tsx`)
- **Data Storage**: JSON files in `infrastructure/db/`
- **Scraping**: Puppeteer for X.com threads
- **Social images**: `app/turra/[id]/opengraph-image.tsx` (generated at build time with `next/og`)
- **Search**: Algolia (`algoliasearch/lite` v5 in `app/components/SearchBar.tsx`)

### Scripts Environment
- **Node.js 22+** with `tsx` for all TypeScript scripts in `scripts/`
- `scripts/package.json` marks the folder as ESM (`"type": "module"`); `scripts/tsconfig.json` holds the strict script config
- **Python 3.8+** only for graph generation (`scripts/create_graph.py`)

## Project Structure

### Core Directories
- `/app` - Next.js pages and components (App Router)
- `/infrastructure` - Data layer with TypeScript utilities and JSON databases
- `/scripts` - Data processing tools (Node.js/TypeScript via tsx, plus one Python script)
- `/public` - Static assets and generated metadata images

### Key Data Files (Auto-Generated - DO NOT EDIT)
- `infrastructure/db/tweets.json` - Main tweet data
- `infrastructure/db/tweets-db.json` - Algolia search database
- `infrastructure/db/tweets_enriched.json` - Enhanced tweet data
- `infrastructure/db/books-not-enriched.json` - Book references

### Manually Managed Data Files
- `infrastructure/db/tweets_map.json` - Tweet categorization
- `infrastructure/db/tweets_summary.json` - Thread summaries
- `infrastructure/db/tweets_exam.json` - Quiz questions
- `infrastructure/db/books.json` - Categorized book references

## Important Development Notes

### JSON Database Handling
- **NEVER** manually edit auto-generated JSON files in `infrastructure/db/`
- For large JSON files, use `jq` for inspection instead of reading directly
- Example: `cat infrastructure/db/tweets.json | jq '.[] | select(.id == "1234567890")'`

### Adding New X.com Threads

**AUTOMATED METHOD (Recommended):**
Use the Claude Code hook by typing: `add thread [thread_id] [first_tweet_text]`
Example: `add thread 1234567890123456789 Este es el primer tweet del hilo`

The hook will automatically execute the complete workflow including AI processing.

**MANUAL METHOD:**
Use the automated script: `./scripts/add_thread.sh $thread_id $first_tweet_text`

Or follow the manual process:
1. Add tweet to CSV: `npm run add-tweet -- $id "$first_tweet_line"`
2. Scrape: `npm run scrape`
3. Enrich: `npm run enrich`
4. Move downloaded media: `mv metadata/* public/metadata/`
5. Update Algolia: `npm run algolia`
6. Generate books: `npm run books`
7. Enrich books: `npm run book-enrich`
8. Graph: `npm run graph`
9. AI enrichment: `npm run ai-local -- $id` (generates summary, categories, exam via local Ollama)
10. Test with `npm run dev` (header "last update" is derived automatically from latest tweet date)

### Environment Setup
- Node.js version management with nvm recommended
- Puppeteer browser installation: `npx @puppeteer/browsers install chrome`
- Environment variables in `.env` for X/Twitter credentials, `OLLAMA_MODEL` (default: `llama3.2`), and `OLLAMA_BASE_URL` (default: `http://localhost:11434`)

### Obsidian Export Notes
- `scripts/export-turra-obsidian.ts` creates a zettelkasten-style `atom` note from a thread ID or tweet ID
- `scripts/export-obsidian-all.ts` exports all thread IDs from `infrastructure/db/turras.csv` and writes retry/report files
- Markdown title uses `tweets_summary.json` when available
- Optional `--with-key-ideas-ai` enables local AI-generated key ideas (Ollama), otherwise key ideas are omitted
- Batch mode enables AI key ideas by default and supports `--only-failed` to retry only failed IDs
- File naming convention: `<thread_id>-<summary_slug>.md`

## Code Architecture Patterns

### Component Structure
- Components in `/app/components/` using TypeScript and React 19
- Consistent use of TailwindCSS classes with custom whiskey color palette

### Data Flow
1. Raw threads scraped from X.com → `tweets.json`
2. Enrichment process → `tweets_enriched.json`
3. Manual categorization → `tweets_map.json`, `tweets_summary.json`
4. Search indexing → `tweets-db.json`
5. Frontend consumption via infrastructure utilities

### Infrastructure Layer
- TypeScript utilities in `/infrastructure/`
- Constants and author definitions in `constants.ts`
- Data provider pattern for tweet access
- Open Graph images generated per turra via `opengraph-image.tsx`

## Special Considerations

### Runtime Environment
- Frontend and all TypeScript scripts use Node.js (scripts via `tsx`)
- Python used only for graph generation

### Image and Metadata Management
- Tweet media is downloaded to `metadata/` during enrichment and must be moved to `public/metadata/` for web access
- Social preview images are generated by `app/turra/[id]/opengraph-image.tsx`

### Video & GIF Support
- X.com has two types of video media: **GIFs** (`tweet_video/`) and **uploaded videos** (`ext_tw_video/`)
- Both are `<video>` elements in X.com's DOM, but with different behaviors and URL patterns

#### GIFs (tweet_video)
- DOM: `<video>` inside `div[data-testid="tweetPhoto"]` with direct MP4 `src`
- URL pattern: poster `pbs.twimg.com/tweet_video_thumb/{ID}` → video `video.twimg.com/tweet_video/{ID}.mp4`
- Rendering: autoplay, loop, muted, no controls

#### Uploaded Videos (ext_tw_video)
- DOM (mobile): `<video>` inside `div[data-testid="videoPlayer"]` (NOT `tweetPhoto`) with `blob:` src
- DOM (desktop): may be inside `tweetPhoto > videoPlayer` with `blob:` src
- URL pattern: poster `pbs.twimg.com/ext_tw_video_thumb/{ID}/pu/img/...` → video `video.twimg.com/ext_tw_video/{ID}/pu/vid/avc1/.../file.mp4`
- Real MP4 URLs only available via GraphQL API responses (`extended_entities.media[].video_info.variants`)
- Rendering: autoplay muted, controls visible, no loop

#### Embedded (Quoted) Tweets
- DOM extraction tries `a[href*="/status/"]` inside embedded tweet container, but X.com mobile DOM often doesn't render this link → `id: "unknown"`
- **GraphQL interceptor** (`scripts/recorder.ts`): `extractQuotedTweetFromGraphQL()` walks `quoted_status_result` in GraphQL JSON, extracts `rest_id` and `screen_name`, caches in `interceptedQuotedTweets` Map keyed by parent tweet's `rest_id`
- **Post-processing** (`parseTweet()`): when embed ID is "unknown", looks up parent tweet in interceptor cache to fill `embed.id` and `embed.url`
- **Enrichment** (`scripts/tweets_enrichment.ts`): `patchExistingEmbedIds()` retroactively resolves unknown IDs from tweet text URLs and reconstructs missing URLs from `@handle` + `embeddedTweetId`
- Data model: `embeddedTweetId` and `url` on `EnrichedTweetData` (type "embed")

#### Scraper Pipeline
- **GraphQL interceptor** (`scripts/recorder.ts`): `page.on('response')` intercepts GraphQL responses, walks JSON recursively to find `video_info.variants`, caches best MP4 URL by `id_str` in `interceptedVideoUrls` Map; also extracts card URLs (`interceptedCardUrls`) and quoted tweet data (`interceptedQuotedTweets`)
- **DOM extraction** (`parseTweet()`): checks `tweetPhoto` containers first, falls back to standalone `videoPlayer` containers for uploaded videos on mobile
- **Post-processing** (`parseTweet()`): replaces `blob:` URLs with real URLs from interceptor cache; uses `extractMediaIdFromPoster()` to match poster thumbnails to cached video URLs; fills unknown embed IDs from quoted tweet cache
- **Enrichment** (`scripts/tweets_enrichment.ts`): `patchExistingGifEntries()` derives GIF URLs from poster patterns; `isBlobUrl()` safety net filters leaked blob URLs; `patchExistingEmbedIds()` resolves unknown embed IDs and reconstructs missing URLs

#### Infrastructure
- **Rendering** (`app/components/GifVideo.tsx`): `"use client"` component; auto-detects GIF vs uploaded video from URL pattern (`ext_tw_video` → controls + no loop)
- **Video proxy** (`app/api/tweet-video/[...path]/route.ts`): proxies `video.twimg.com` requests to bypass CDN 403 Forbidden (Twitter checks `Referer` header); catch-all `[...path]` handles both `tweet_video/` and `ext_tw_video/` paths
- Data model: `video?: string` field on `TweetImageMetadata`, `TweetEmbedMetadata`, `EnrichedTweetMetadata`, `EnrichedTweetData`

### Search Integration
- Algolia search requires index updates after content changes
- Search database generated by `make-algolia-db.ts`
- Clear existing index before uploading new data

## Development Guidelines

### Agent and MCP Server Usage
- **ALWAYS** use available specialized agents for tasks that match their descriptions
- **PRIORITIZE** relevant MCP servers for enhanced functionality
- Agents available: `glossary-terminology-manager`, `tweet-scraper-agent`, etc.
- MCP servers provide additional tools and capabilities beyond standard tools

### Claude Code Hook Integration
- **Hook Installed**: `auto_thread_hook.sh` automatically processes thread addition requests
- **Activation Pattern**: Type `add thread [id] [text]` to trigger automated workflow
- **Hook Location**: `scripts/auto_thread_hook.sh` (executable)
- **Configuration**: `.claude/settings.json` contains local project hook settings
- **Logs**: Check `~/.claude/thread_hook.log` for hook activity

### Version Control and Deployment
- **NEVER** commit or push changes without explicit user permission
- Always ask before running `git commit`, `git push`, or equivalent commands
- Use proper commit messages following existing patterns when authorized

### Development Workflow
- **Frontend**: `npm run dev`, `npm run build`
- **Scripts**: `npm run <script>` (see Data Script Commands); run a one-off script with `npx tsx scripts/<file>.ts`
- **Validation**: Always run `npm run check` before deployment
- **Type Checking**: `npm run typecheck` must pass (app + scripts)

### TypeScript and Type Safety
- **ALWAYS** maintain TypeScript types up-to-date across all files
- Update type definitions when modifying data structures
- Ensure type safety in all new implementations and modifications
- Run `npm run lint` to verify compliance
- **Strict mode enabled** in both tsconfigs with `exactOptionalPropertyTypes`

### Requirements and Dependencies
- **MAINTAIN** all requirements updated in PRD-create MCP server
- All implementations **MUST** respect existing requirements and constraints
- Update package.json dependencies when adding new functionality
- Document any new system requirements or dependencies

### Data Integrity Protection
- **NEVER** destroy or overwrite existing information in JSON database files
- Always preserve existing data when making updates or modifications
- Use append-only or merge strategies for database updates
- Validate data integrity after any database modifications
- Create backups before major data transformations

### Card Metadata Contract
- `domain` must contain a real hostname (for grouping and icon/category logic)
- `title` is the primary card label shown in UI (X card text or fetched page title)
- `description` is secondary preview text from page metadata
- Legacy `caption` is deprecated and should be migrated to `title` during backfills
- Preferred backfill flow: `npm run fix-tweet -- ...` followed by `npm run enrich`
