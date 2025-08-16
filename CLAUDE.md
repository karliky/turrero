# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start Next.js development server (localhost:3000)
- `npm run build` - Build production version
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

### Deno Script Commands (Primary)
- `deno task scrape` - Run thread scraping tool
- `deno task enrich` - Run tweet enrichment process
- `deno task books` - Generate book references
- `deno task algolia` - Update Algolia search index
- `deno task validate` - Validate Deno scripts and types
- `./scripts/add_thread.sh $id $first_tweet_line` - Add new thread (automated workflow)

### Development Pipeline Commands
- `npm run pipeline:validate` - Validate both Next.js and Deno environments
- `npm run pipeline:build` - Build complete project (Next.js + Deno compatibility)
- `npm run pipeline:test` - Run all tests (Next.js + Deno scripts)
- `npm run pipeline:full` - Complete validation → build → test pipeline

### Legacy Node.js Commands
- `cd scripts && npm run generate-pdf` - Generate PDF from data (Node.js)

### Testing Individual Tweets
- `deno task scrape --test $tweet_id` - Test scraping a single tweet (auto-detects username)
- `deno run --allow-all scripts/recorder.ts --test $tweet_id` - Direct test with auto-detection

## Tech Stack & Architecture

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **TailwindCSS** with Preline UI components
- Fonts: Geist Sans and Geist Mono

### Data & Infrastructure
- **Hybrid Runtime Architecture**: Node.js for frontend, Deno for scripts
- **Data Storage**: JSON files in `infrastructure/db/`
- **Scraping**: Puppeteer for X.com threads (Deno runtime)
- **Image Processing**: Jimp for metadata card generation (Deno runtime)
- **Search**: Algolia integration (Deno runtime)

### Scripts Environment (Modernized)
- **Deno 1.41+** for primary scripts (enrichment, scraping, data processing)
- **Node.js 22+** for Next.js frontend and legacy scripts
- **Python 3.8+** for graph generation
- **Dual validation pipeline** for both runtimes

### Deno Configuration
- **Import maps** configured in `deno.json` for seamless dependency resolution
- **NPM package support** via `npm:` specifiers for Node.js compatibility
- **Strict TypeScript** with enhanced type checking
- **Built-in formatting and linting** with `deno fmt` and `deno lint`

## Project Structure

### Core Directories
- `/app` - Next.js pages and components (App Router)
- `/infrastructure` - Data layer with TypeScript utilities and JSON databases
- `/scripts` - Data processing tools (Node.js, Deno, Python mix)
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
Use the Claude Code hook by typing: `add thread [thread_id]`
Example: `add thread 1234567890123456789`

The system will automatically:
- **Auto-detect the correct username** (no need to specify @username)
- **Extract tweet content** after scraping (no need to provide first tweet text)
- Execute the complete 12-step workflow including AI processing

**MANUAL METHOD:**
Use the automated script: `./scripts/add_thread.sh $thread_id`
Example: `./scripts/add_thread.sh 1234567890123456789`

**ENHANCED FEATURES:**
- **Smart Username Detection**: Automatically finds the correct @username for any tweet ID
- **Post-Scraping CSV Update**: Content is added to `turras.csv` after successful scraping
- **Simplified Parameters**: Only tweet ID required - all other data is auto-detected

Or follow the manual 11-step process:
1. Scrape with auto-detection: `deno run --allow-all scripts/recorder.ts`
2. Add scraped content to CSV: `deno run --allow-all scripts/add-scraped-tweet.ts $tweet_id`
3. Enrich: `deno run --allow-all scripts/tweets_enrichment.ts`
4. Generate cards: `deno task images`
5. Move metadata: `mv scripts/metadata/* public/metadata/`
6. Update Algolia: `deno run --allow-all scripts/make-algolia-db.ts`
7. Generate books: `deno run --allow-all scripts/generate-books.ts`
8. Enrich books: `deno run --allow-all scripts/book-enrichment.ts`
9. Generate prompts: `./scripts/generate_prompts.sh`
10. Process AI prompts with `ai-prompt-processor` agent: reads generated prompts, processes them with AI, and updates the corresponding JSON database files (`tweets_summary.json`, `tweets_map.json`, `tweets_exam.json`, `books.json`)
11. Update header date manually in `app/components/Header.tsx`
12. Test with `npm run dev`

### Deno Usage
- Required permissions: `--allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run`
- Use `--allow-all` for development convenience
- Deno config in `deno.json` with DOM and Deno libraries enabled

### Environment Setup
- Node.js version management with nvm recommended
- Puppeteer browser installation: `npx @puppeteer/browsers install chrome`
- Environment variables in `.env` for X/Twitter credentials

## Code Architecture Patterns

### Component Structure
- Components in `/app/components/` using TypeScript and React 19
- Consistent use of TailwindCSS classes with custom whiskey color palette
- Preline UI components for complex interactions

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
- Image metadata generation for social sharing

## Special Considerations

### Multi-Runtime Environment
- Frontend and most scripts use Node.js
- Thread scraping specifically uses Deno for modern runtime features
- Python used only for graph generation
- Separate package.json files for root and scripts directory

### Image and Metadata Management
- Metadata images auto-generated in `scripts/metadata/`
- Must be moved to `public/metadata/` for web access
- Images optimized for social media sharing (OpenGraph, Twitter Cards)

### Search Integration
- Algolia search requires index updates after content changes
- Search database generated by `make-algolia-db.ts`
- Clear existing index before uploading new data

## Development Guidelines

### Agent and MCP Server Usage
- **ALWAYS** use available specialized agents for tasks that match their descriptions
- **PRIORITIZE** relevant MCP servers for enhanced functionality
- Agents available: `glossary-terminology-manager`, `ai-prompt-processor`, `tweet-scraper-agent`, etc.
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

### Hybrid Runtime Development
- **Frontend Development**: Use Node.js commands (`npm run dev`, `npm run build`)
- **Script Development**: Use Deno commands (`deno task`, `deno check`, `deno fmt`)
- **Unified Pipeline**: Use `npm run pipeline:*` commands for full system validation
- **Environment Validation**: Always run `npm run pipeline:validate` before deployment
- **Type Checking**: Both `npx tsc --noEmit` (Node.js) and `deno check` (Deno) must pass

### TypeScript and Type Safety
- **ALWAYS** maintain TypeScript types up-to-date across all files
- Update type definitions when modifying data structures
- Ensure type safety in all new implementations and modifications
- Run `npm run lint` (Node.js) and `deno task lint` (Deno) to verify compliance
- **Strict mode enabled** in both environments with `exactOptionalPropertyTypes`

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