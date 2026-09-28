-- Two Goodreads links that are not books (a shelf and a quote) entered the library through the legacy scraper
DELETE FROM books WHERE url IN (
  'https://www.goodreads.com/shelf/show/fixer-upper',
  'https://www.goodreads.com/quotes/8692961-bernoulli-observed-that-most-people-dislike-risk-the-chance-of'
);
