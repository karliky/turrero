# El Turrero Post

Welcome to the El Turrero Post project! This website is designed to showcase the
x.com threads of Javier G. Recuenco who specializes in complexity science. The
goal of the website is to present the he's tweets in a visually pleasing and
easy-to-navigate format.

## Features

- A clean, minimalist design that puts the focus on the threads
- Automatic embedding of images and cards from x.com
- A simple navigation system that makes it easy to find specific threads
- The ability to search for specific keywords within the threads

## Kown bugs or improvements

- Add blocks: #preguntaalrecu y latest 25 cronologic turras
- Show cards with card design (for those with url)
- Some dates are incorrectly scraped, example
  https://x.com/Recuenco/status/1614168029876600833
- Add copy link to every tweet so we can share it, like lexical.dev does on the
  left of every block

## More resources

- [Javier G. Recuenco](https://x.com/Recuenco)
- [Comunidad CPS](https://x.com/CPSComunidad)
- [Comunidad CPS (Youtube)](https://youtube.com/@cpsspain)
- [Polymatas: Sabiduría = Conocimiento + Razón + Aprendizaje](https://www.polymatas.com/)
- [CPS Notebook](https://cps.tonidorta.com)

## Technology Used

The website is built using:

- Node.js 22 or higher for the front-end and server-side rendering
- Node.js 22 or higher for the scraping tools
- Deno 1.41 or higher for the tweet scraping script (install from
  https://deno.com)
- python 3.8 or higher to generate the graph
- Puppeteer for web scraping x.com threads

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
   required fields)
5. Start the development server: `npm run dev`
6. Open the website in your browser: `http://localhost:3000`

## Adding new threads

The process of adding a new thread is half manual half automated:

You could use the script: `$ ./scripts/add_thread.sh $id $first_tweet_line`
where `id` is the first tweet id (thread id) and `first_tweet_line` is the first
tweet text.

Alternatively you could use the following steps:

1. `node ./scripts/add-new-tweet.js $id $first_tweet_line` to add the first
   tweet id (thread id) and the first tweet text to ontop of the turras.csv file
2. `deno --allow-all scripts/recorder.ts`. This will scrap it and save it into
   tweets.json
3. `node ./scripts/tweets_enrichment.js`
4. `node ./scripts/image-card-generator.js`
5. Move the `./scripts/metadata` content into `public/metadata`, you can use the
   following command `mv -v ./metadata/* ./public/metadata/`
6. `node ./scripts/make-algolia-db.js` then update the index in the Algolia
   service, clear the index and fetch the `db/tweets-db.json` file
7. `node ./scripts/generate-books.js` this will update the
   `db/books-not-enriched.json`
8. `node ./scripts/book-enrichment.js` this will output the list of books you
   should use in the last prompt to get the category of books and update the
   `db/books.json`
9. Use the `./scripts/generate_prompts.sh` to generate the prompts to be used
   with ChatGPT (or the LLM of your choice) and obtain the summary, categories
   and questions to include in `db/tweets_summary.json`, `db/tweets_map.json`
   and `db/tweets_exam.json` respectively
10. Change manually the date on the file `components/header.js` to the latest
    update date
11. Verify that everything is fine by running `npm run dev` on the root folder

The data source that contains the x.com threads and metadata is located under
`/infrastructure`.

The files `db/tweets.json, db/tweets-db.json, db/tweets_enriched.json` are
automatically generated and should not be manually edited. The files
`db/tweets_map.json, db/tweets_summary.json`, `db/tweets_exam.json` should be
manually edited.

## Debug

if a single tweet fails, test to download and parse it in isolation without
consequences by using the scrapper like this:

`node ./scripts/recorder.js --test id`

Read the comments in it to figure out better debug.

## Contribution

We welcome contributions to this project. If you find any bugs or have any
suggestions for new features, please open an issue or a pull request on the
GitHub repository.
