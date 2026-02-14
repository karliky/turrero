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

### Hybrid Runtime Architecture
- **Frontend**: Next.js 15 with React 19 for optimal user experience
- **Scripts**: Deno for data processing with modern JavaScript features
- **Database**: JSON-based with strict schema validation
- **Pipeline**: Automated validation and build processes

### Development Pipeline
```bash
npm run pipeline:validate    # Validate both Node.js and Deno environments
npm run pipeline:build      # Build complete project
npm run pipeline:test       # Run all tests
npm run pipeline:full       # Complete validation → build → test
```

## More resources

- [Javier G. Recuenco](https://x.com/Recuenco)
- [Comunidad CPS](https://x.com/CPSComunidad)
- [Comunidad CPS (Youtube)](https://youtube.com/@cpsspain)
- [Polymatas: Sabiduría = Conocimiento + Razón + Aprendizaje](https://www.polymatas.com/)
- [CPS Notebook](https://cps.tonidorta.com)

## Technology Used

The website is built using:

- **Next.js 15** with App Router for the frontend
- **React 19** with TypeScript for components  
- **Node.js 22+** for frontend and legacy scripts
- **Deno 1.41+** for primary data processing scripts
- **Python 3.8+** for graph generation
- **Puppeteer** for web scraping X.com threads
- **Ollama** for local AI enrichment (summary, categories, exam generation)
- **Hybrid Architecture**: Node.js frontend + Deno scripts for optimal performance

You can handle node.js versions by using nvm, for example:

```bash
nvm use v23.3.0
nvm alias default 23.3.0 # now should be forever default
```

### Setting up Deno

Slowly nodejs for the scrapping tools will be replaced fot deno.

1. Install Deno:
   - Using Shell (Mac, Linux):
     ```bash
     curl -fsSL https://deno.land/install.sh | sh
     ```
   - Using Homebrew (Mac):
     ```bash
     brew install deno
     ```
   - Other methods available at https://deno.com

2. Verify installation: `deno --version` (should be 1.41 or higher)

3. Configure environment:
   - Add Deno to your path (if not done automatically)
   - Set environment variables if needed:
     ```bash
     # Optional: Set custom cache directory
     export DENO_DIR="$HOME/.cache/deno"
     # Optional: Disable auto package.json resolution
     export DENO_NO_PACKAGE_JSON=1
     ```

4. Install Deno VS Code extension for better development experience

5. The scraping script requires these permissions:
   ```bash
   deno run --allow-read --allow-write --allow-env --allow-net --allow-sys --allow-run scripts/recorder.ts
   ```
   Or use `--allow-all` for convenience during development

6. Useful Deno commands:
   - `deno fmt` - Format your code
   - `deno lint` - Lint your code
   - `deno test` - Run tests
   - `deno task` - Run tasks defined in config

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

1. `deno run --allow-all scripts/add-new-tweet.ts $id "$first_tweet_line"` to add the first
   tweet id (thread id) and the first tweet text to the top of `infrastructure/db/turras.csv`
2. `deno task scrape` — scrapes the thread and appends it to `infrastructure/db/tweets.json`
3. `deno task enrich` — enriches tweets (cards, media, embedded tweets; resolves unknown embed IDs and normalizes card fields)
4. Generate metadata images (e.g. `node scripts/image-card-generator.js` if available), then move `scripts/metadata/*` to `public/metadata/`
5. `deno task algolia` — updates `infrastructure/db/tweets-db.json`; then update the Algolia index (clear and upload the file)
6. `deno task books` — updates `infrastructure/db/books-not-enriched.json`
7. `deno task book-enrich` — book enrichment
8. `deno task ai-local $id` — generates summary, categories, and exam via local Ollama
9. Regenerate graph data: `python3 scripts/create_graph.py`
10. Verify with `npm run dev`

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
deno task scrape -- --test $tweet_id
```

### Backfill Card Metadata

Use this when a link card has wrong/missing title or domain, or when legacy `caption`
data needs to be migrated.

```bash
deno task scrape -- --fix-tweet <tweet_id_1> <tweet_id_2> ...
deno task enrich
```

Card field contract:
- `domain`: real hostname (for grouping and icon/category logic)
- `title`: visible card label (from X card text or fetched page title)
- `description`: page summary/preview text
- `caption`: deprecated legacy field; should not be used going forward

Check the script and logs for more debugging options.

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
