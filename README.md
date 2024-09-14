# El Turrero Post

Welcome to the El Turrero Post project! This website is designed to showcase the Twitter threads of Javier G. Recuenco who specializes in complexity science. The goal of the website is to present the he's tweets in a visually pleasing and easy-to-navigate format.

## Features

- A clean, minimalist design that puts the focus on the threads
- Automatic embedding of images and cards from Twitter
- A simple navigation system that makes it easy to find specific threads
- The ability to search for specific keywords within the threads

## Kown bugs or improvements

- Add blocks: #preguntaalrecu y latest 25 cronologic turras 
- Show cards with card design (for those with url)
- Some dates are incorrectly scraped, example https://twitter.com/Recuenco/status/1614168029876600833
- Add copy link to every tweet so we can share it, like lexical.dev does on the left of every block

## More resources

- [Javier G. Recuenco](https://twitter.com/Recuenco)
- [Polymatas: Sabiduría = Conocimiento + Razón + Aprendizaje](https://www.polymatas.com/)
- [CPS Notebook](https://cps.tonidorta.com)

## Technology Used

The website is built using:

- Next.js for the front-end and server-side rendering
- Node.js for the back-end and the scraping tools
- Puppeter for web scraping twitter threads

## Getting Started

The front-end is located at the root of the project folder and the scraping logic is located under the `scripts` folder on its own package.

To get started with the project, you will need to clone the repository and install the dependencies. Here are the steps:

1. Clone the repository: `git clone git@github.com:karliky/turrero.git`
2. Install the dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open the website in your browser: `http://localhost:3000`

## Adding new threads

The process of adding a new thread is half manual half automated:

You could use the script: `$ ./scripts/add_thread.sh $id $first_tweet_line` where `id` is the first tweet id (thread id) and `first_tweet_line` is the first tweet text.

Alternatively you could use the following steps:

1. `$ node ./scripts/add-new-tweet.js $id $first_tweet_line` to add the first twwet id (thread id) and the first tweet text to ontop of the turras.csv file
2. `$ node ./scripts/recorder.js`. This will scrap it and save it into tweets.json
3. `$ node ./scripts/tweets_enrichment.js`
4. `$ node ./scripts/image-card-generator.js`
5. Move the `./scripts/metadata` content into `public/metadata`, you can use the following command `mv -v ./metadata/* ./public/metadata/`
6. `$ node ./scripts/make-algolia-db.js` then update the index in the Algolia service, clear the index and fetch the `db/tweets-db.json` file
7. `$ node ./scripts/generate-books.js` this will update the `db/books-not-enriched.json`
8. `$ node ./scripts/book-enrichment.js` this will output the list of books you should use in the last prompt to get the category of books and update the `db/books.json`
9. Use the `$ ./scripts/generate_prompts.sh` to generate the prompts to be used with ChatGPT (or the LLM of your choice) and obtain the summary, categories and questions to include in `db/tweets_summary.json`, `db/tweets_map.json` and `db/tweets_exam.json` respectively
10. Change manually the date on the file `components/header.tsx` to the latest update date
11. Verify that everything is fine by running `npm run dev` on the root folder

The files `db/tweets.json, db/tweets-db.json, db/tweets_enriched.json` are automatically generated and should not be manually edited.
The files `db/tweets_map.json, db/tweets_summary.json`, `db/tweets_exam.json` should be manually edited.

## Contribution

We welcome contributions to this project. If you find any bugs or have any suggestions for new features, please open an issue or a pull request on the GitHub repository.
