# CLAUDE.md

## Essential Commands

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build production version
- `npm run lint` - Run ESLint checks

### Thread Processing
- `deno task add-thread [thread_id]` - Complete pipeline from scraping to AI processing
- `add thread [thread_id]` - Claude Code hook for automated processing

### Data Management
- `deno task db-check` - Check database integrity
- `deno task db-fix` - Fix database inconsistencies
- `deno task algolia` - Update search index
- `deno task clean` - Clean all cache and temporary files

## Tech Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript + TailwindCSS
- **Scripts**: Deno 1.41+ for data processing, Node.js 22+ for frontend
- **Data**: JSON files in `infrastructure/db/`, Algolia search
- **Scraping**: Puppeteer for X.com threads

## Project Structure
- `/app` - Next.js pages and components
- `/infrastructure` - Data layer and JSON databases
- `/scripts` - Data processing tools
- `/public` - Static assets

### Key Files
- **Auto-generated**: `tweets.json`, `tweets_enriched.json`, `tweets-db.json`
- **Manual**: `tweets_map.json`, `tweets_summary.json`, `tweets_exam.json`

## Development Guidelines

### Data Integrity
- **NEVER** manually edit auto-generated JSON files
- Use atomic operations with automatic rollback
- Run `deno task db-check` before major changes

### Adding Threads
Use: `deno task add-thread [thread_id]` or `add thread [thread_id]`
- Complete pipeline from scraping to AI processing  
- Automatic username detection and database integrity

### Version Control
- **NEVER** commit or push without explicit user permission
- Always ask before running git commands

### TypeScript
- Maintain strict type safety across all files
- Run `npm run lint` and `deno task lint` to verify compliance
- Update type definitions when modifying data structures