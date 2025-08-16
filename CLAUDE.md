# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start Next.js development server (localhost:3000)
- `npm run build` - Build production version
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

### Essential Deno Commands
- `deno task add-thread` - Complete thread processing pipeline (ID only required)
- `deno task scrape` - Run thread scraping tool
- `deno task enrich` - Run tweet enrichment process  
- `deno task ai-process` - Generate AI prompts and process with Claude CLI
- `deno task algolia` - Update Algolia search index
- `deno task db-check` - Check database integrity and consistency
- `deno task db-fix` - Fix database inconsistencies interactively
- `deno task typecheck` - Validate frontend + backend types

### Legacy Node.js Commands
- `cd scripts && npm run generate-pdf` - Generate PDF from data (Node.js)

### Testing Individual Tweets
- `deno task scrape --test $tweet_id` - Test scraping a single tweet (auto-detects username)
- `deno run --allow-all scripts/recorder.ts --test $tweet_id` - Direct test with auto-detection

### AI Prompt Processing
- `deno task ai-process $thread_id` - Full AI processing with Claude CLI integration
- `deno task ai-process --test $thread_id` - Generate prompt files without Claude execution
- `deno task ai-process --no-claude $thread_id` - Force prompt file generation only
- `deno task ai-process --verbose $thread_id` - Detailed logging output
- **Features**: Thread text extraction, Claude CLI auto-detection, smart response parsing, atomic database updates
- **Fallback**: Generates prompt files with ChatGPT instructions when Claude CLI unavailable

### Database Integrity & Repair
- `deno task db-check` - Comprehensive database validation and analysis
- `deno task db-fix` - Interactive repair mode with automated corrections
- **Features**: 
  - **Metadata Asset Analysis**: Detect unused files and broken references
  - **Tweet-Turra Consistency**: Validates every tweet has corresponding turra entry
  - **Cross-file Validation**: Ensures consistency across all JSON databases
  - **Interactive Repair**: User-guided fixes with backup creation
  - **Orphan Detection**: Finds orphaned records and media files

### Header Date Management
- **Note**: Header dates are **automatically calculated** from newest tweet - no manual updates needed!

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

**SIMPLE METHOD (Recommended):**
Use the complete pipeline: `deno task add-thread [thread_id]`
Example: `deno task add-thread 1234567890123456789`

**AUTOMATED METHOD (Claude Code Hook):**
Use the Claude Code hook by typing: `add thread [thread_id]`
Example: `add thread 1234567890123456789`

**FEATURES:**
- **One Command**: Complete pipeline from scraping to AI processing
- **Smart Detection**: Automatically finds the correct @username for any tweet ID
- **Atomic Operations**: Database integrity with automatic rollback capabilities
- **Auto-Date Updates**: Header dates automatically calculated from newest tweet
- **AI Processing**: Headless Claude CLI with ChatGPT fallback instructions

**Manual Process (if needed):**
1. Scrape: `deno task scrape`
2. Enrich: `deno task enrich`
3. AI process: `deno task ai-process $thread_id`
4. Update search: `deno task algolia`
5. Check integrity: `deno task db-check`
6. Test: `npm run dev`

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

### Data Integrity Protection (ENHANCED)
- **NEVER** destroy or overwrite existing information in JSON database files
- **ATOMIC OPERATIONS**: All database updates use atomic operations with automatic rollback
- **SCHEMA VALIDATION**: Comprehensive Zod schema validation for all JSON operations
- **BACKUP SYSTEM**: Automatic timestamped backups before any modifications
- **INTEGRITY MONITORING**: Real-time validation with `deno task db:validate`
- **CROSS-FILE CONSISTENCY**: Automated detection of orphaned records and duplicates
- Use append-only or merge strategies for database updates
- **ERROR RECOVERY**: Graceful rollback mechanisms for failed operations
- Create backups before major data transformations

### Performance Optimization (NEW)
- **95.2% Performance Improvement**: Parallel processing reduces execution from 3-5 minutes to ~5.5 seconds
- **Concurrent Execution**: Up to 6 parallel operations with intelligent dependency management
- **Resource Efficiency**: Peak memory usage optimized to 6.5MB
- **Real-time Monitoring**: Built-in performance tracking and bottleneck analysis
- **Benchmarking**: Automated performance comparison and optimization suggestions
- Use `deno task parallel:benchmark` for performance analysis
- Monitor execution with `deno task monitor:dashboard`

### Error Handling & Recovery (NEW)
- **Comprehensive Error Detection**: 6 specialized error handlers for different failure types
- **Actionable Feedback**: Clear error messages with specific recovery suggestions
- **Auto-Recovery**: Automated fixes for common issues (file permissions, network timeouts)
- **Graceful Degradation**: System continues functioning even when optional components fail
- **Context-Aware**: Errors categorized by type (File, Network, Claude, Database, Scraping, Pipeline)
- **Error History**: Tracking and statistics for recurring issues
- Use enhanced logging framework for detailed debugging information