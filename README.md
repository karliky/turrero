# El Turrero Post

Welcome to the El Turrero Post project! This website is designed to showcase the
x.com threads of Javier G. Recuenco who specializes in complexity science. The
goal of the website is to present his tweets in a visually pleasing and
easy-to-navigate format.

## Features

- **Clean, minimalist design** focused on thread readability
- **Automatic embedding** of images, cards, animated GIFs and quoted tweets from X.com (embedded tweet IDs resolved from text when scraping misses them)
- **Advanced search** with Algolia-powered indexing
- **Category-based navigation** for organized thread discovery
- **Interactive quizzes** for educational threads
- **Book recommendations** extracted from thread content
- **Local AI enrichment** via Ollama for automated summary, categorization, and exam generation
- **Standardized ID system** for consistent data handling
- **Real-time validation** pipeline for data integrity
- **Responsive design** optimized for all devices

## Known bugs or improvements

- Add blocks: #preguntaalrecu y latest 25 cronologic turras
- Show cards with card design (for those with url)
- Some dates are incorrectly scraped, example
  https://x.com/Recuenco/status/1614168029876600833
- Add copy link to every tweet so we can share it, like lexical.dev does on the
  left of every block

## Recent Architecture Improvements (v2.0)

### ID Standardization System
- **Unified ID Format**: Standardized to `threadId#tweetId` format across all systems
- **Type Safety**: Full TypeScript support with proper ID type definitions
- **Backward Compatibility**: Automatic migration from legacy formats
- **Validation Pipeline**: Comprehensive data integrity checks

### Single Runtime Architecture
- **Frontend**: Next.js 16 (Turbopack) with React 19
- **Scripts**: Node.js + TypeScript executed with [tsx](https://tsx.is)
- **Database**: JSON-based with schema validation
- **Validation**: `npm run check` (typecheck + lint + data flows + schemas)

### Development Commands
```bash
npm run dev          # Start the Next.js dev server
npm run build        # Production build
npm run typecheck    # Type check app (tsconfig.json) and scripts (scripts/tsconfig.json)
npm run lint         # ESLint
npm run check        # typecheck + lint + flows:check + schema:validate
```

## More resources

- [Javier G. Recuenco](https://x.com/Recuenco)
- [Comunidad CPS](https://x.com/CPSComunidad)
- [Comunidad CPS (Youtube)](https://youtube.com/@cpsspain)
- [Polymatas: Sabiduría = Conocimiento + Razón + Aprendizaje](https://www.polymatas.com/)
- [CPS Notebook](https://cps.tonidorta.com)

## Technology Used

The website is built using:

- **Next.js 16** with App Router and Turbopack
- **React 19** with TypeScript
- **Tailwind CSS 4**
- **Node.js 22+** for the frontend and all data scripts (run with `tsx`)
- **Python 3.8+** for graph generation (`npm run graph`)
- **Puppeteer** for scraping X.com threads
- **Ollama** for local AI enrichment (summary, categories, exam generation)

You can handle node.js versions by using nvm, for example:

```bash
nvm use 22
nvm alias default 22
```

## Getting Started

The front-end is located at the root of the project folder and the scraping
logic is located under the `scripts` folder.

To get started with the project, you will need to clone the repository and
install the dependencies. Here are the steps:

1. Clone the repository: `git clone git@github.com:karliky/turrero.git`
2. Install Node.js dependencies: `npm install`
3. Install Puppeteer and its browser dependencies:

```bash
npm install puppeteer-core @puppeteer/browsers
npx @puppeteer/browsers install chrome
```

4. Create a `.env` file with your X/Twitter credentials (see `.env.example` for
   required fields) and optionally set `OLLAMA_MODEL` (default: `llama3.2`)
5. Install Ollama from https://ollama.com and pull your model: `ollama pull llama3.2`
6. Start the development server: `npm run dev`
7. Open the website in your browser: `http://localhost:3000`

## Adding new threads

### Automated Method (Recommended)

**Using Claude Code Hook (Fully Automated):**

If you have the Claude Code hook configured, simply type:
```
add thread 1234567890123456789 This is the first tweet text
```

Claude will automatically detect this pattern and execute the complete workflow including AI processing.

**Using the Script (Semi-Automated):**

You could use the script: `$ ./scripts/add_thread.sh $id $first_tweet_line`
where `id` is the first tweet id (thread id) and `first_tweet_line` is the first
tweet text.

Alternatively you could use the following steps:

1. `npm run add-tweet -- $id "$first_tweet_line"` to add the first
   tweet id (thread id) and the first tweet text to the top of `infrastructure/db/turras.csv`
2. `npm run scrape` — scrapes the thread and appends it to `infrastructure/db/tweets.json`
3. `npm run enrich` — enriches tweets (cards, media, embedded tweets; resolves unknown embed IDs and normalizes card fields)
4. Move downloaded media from `metadata/` to `public/metadata/`
5. `npm run algolia` — updates `infrastructure/db/tweets-db.json`; then update the Algolia index (clear and upload the file)
6. `npm run books` — updates `infrastructure/db/books-not-enriched.json`
7. `npm run book-enrich` — book enrichment
8. `npm run ai-local -- $id` — generates summary, categories, and exam via local Ollama
9. `npm run graph` — regenerates graph data
10. Verify with `npm run dev`

Social preview images (`/turra/<id>/opengraph-image`) are generated automatically at build time.

The “last update” date in the header is derived automatically from the most recent tweet in the data.

The data source that contains the x.com threads and metadata is located under
`/infrastructure`.

The files `db/tweets.json, db/tweets-db.json, db/tweets_enriched.json` are
automatically generated and should not be manually edited. The files
`db/tweets_map.json, db/tweets_summary.json`, `db/tweets_exam.json` should be
manually edited.

## Debug

To test scraping a single tweet in isolation (no changes to `tweets.json`):

```bash
npm run scrape -- --test $tweet_id
```

### Backfill Card Metadata

Use this when a link card has wrong/missing title or domain, or when legacy `caption`
data needs to be migrated.

```bash
npm run fix-tweet -- <tweet_id_1> <tweet_id_2> ...
npm run enrich
```

Card field contract:
- `domain`: real hostname (for grouping and icon/category logic)
- `title`: visible card label (from X card text or fetched page title)
- `description`: page summary/preview text
- `caption`: deprecated legacy field; should not be used going forward

Check the script and logs for more debugging options.

## Exporting to Obsidian

Export a turra as an Obsidian-friendly `atom` note:

```bash
npm run export-obsidian -- --id <thread_or_tweet_id> --out "/path/to/obsidian/folder" --overwrite
```

Notes:
- Output filename format: `<thread_id>-<summary_slug>.md`
- Title is sourced from `infrastructure/db/tweets_summary.json` when available
- Categories are sourced from `infrastructure/db/tweets_map.json` and converted to snake_case tags
- Link cards are sourced from `infrastructure/db/tweets_enriched.json`

Optional AI key ideas (local model):

```bash
npm run export-obsidian -- --id <thread_or_tweet_id> --with-key-ideas-ai --key-ideas-count 5 --out "/path/to/obsidian/folder" --overwrite
```

AI configuration is read from `.env`:
- `OLLAMA_MODEL` (example: `gpt-oss:20b`)
- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)

### Batch export all turras

Export all threads to markdown (AI key ideas enabled by default):

```bash
npm run export-obsidian-all -- --out "/Users/ajramos/Documents/obsidian/chronicles/02-Atoms/CPS/Turras" --overwrite
```

If there are failures, the script writes:
- `<out>/_export_obsidian_failed_ids.txt` (IDs to retry)
- `<out>/_export_obsidian_report.json` (full execution report)

Retry only failed exports:

```bash
npm run export-obsidian-all -- --out "/Users/ajramos/Documents/obsidian/chronicles/02-Atoms/CPS/Turras" --only-failed --overwrite
```

Useful flags:
- `--without-ai` disables local AI key ideas generation
- `--key-ideas-count <n>` controls how many key ideas to request
- `--key-ideas-model <model>` overrides `OLLAMA_MODEL`
- `--ollama-url <url>` overrides `OLLAMA_BASE_URL`
- `--limit <n>` test mode for first N turras
- `--delay-ms <n>` adds delay between exports

## Claude Code Hook Setup

To enable the automated thread processing feature with Claude Code:

### 1. Install the Hook Configuration

Copy the hook configuration to your Claude Code settings:

**Hook Already Configured:**
The hook is already configured in `.claude/settings.json` in this project.

**For Global Configuration (Optional):**
To use this hook in other projects, add to your `~/.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "add.*thread|new.*thread|thread.*[0-9]{15,20}",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/auto_thread_hook.sh"
          }
        ]
      }
    ]
  }
}
```

### 2. Verify Hook Installation

Test the hook by typing in Claude Code:
```
add thread 1234567890123456789 Test thread content
```

### 3. Hook Features

- **Automatic Detection**: Recognizes thread addition patterns
- **Complete Workflow**: Executes all steps automatically
- **AI Processing**: Uses local Ollama for summary, categories, and exam generation
- **Error Handling**: Provides feedback and logs issues
- **Safe Execution**: Always exits successfully to avoid blocking Claude

### 4. Hook Logs

Check hook activity:
```bash
tail -f ~/.claude/thread_hook.log
```

## Contribution

We welcome contributions to this project. If you find any bugs or have any
suggestions for new features, please open an issue or a pull request on the
GitHub repository.
