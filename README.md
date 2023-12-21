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

The front-end is located at the root of the project folder and the scraping logic is located under the `scrapper` folder on its own package.

To get started with the project, you will need to clone the repository and install the dependencies. Here are the steps:

1. Clone the repository: `git clone git@github.com:karliky/turrero.git`
2. Install the dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open the website in your browser: `http://localhost:3000`

## Adding new threads

The process of adding a new thread is half manual half automated:

1. Manually add the first tweet id to ontop of the turras.csv file
2. `$ node ./scrapper/recorder.js` // This will scrap it and save it into tweets.json
3. `$ node ./scrapper/tweets_enrichment.js`
4. Move the `./scrapper/metadata` content into `public/metadata`
5. Verify that everything is fine by running `npm run dev` on the root folder

The files `db/tweets.json, db/tweets-db.json, db/tweets_enriched.json` are automatically generated and should not be manually edited.
The files `db/tweets_map.json, db/tweets_summary.json` should be manually edited.

## Contribution

We welcome contributions to this project. If you find any bugs or have any suggestions for new features, please open an issue or a pull request on the GitHub repository.
