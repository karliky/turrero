-- Canonical schema. IDs are TEXT (X snowflakes exceed JS safe integers), dates are ISO-8601 UTC.

CREATE TABLE authors (
  handle     TEXT PRIMARY KEY COLLATE NOCASE,
  x_user_id  TEXT UNIQUE,
  name       TEXT NOT NULL,
  avatar_url TEXT
);

CREATE TABLE categories (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  position    INTEGER NOT NULL UNIQUE
);

CREATE TABLE threads (
  id            TEXT PRIMARY KEY, -- root tweet id
  author_handle TEXT NOT NULL REFERENCES authors(handle) ON UPDATE CASCADE,
  title         TEXT NOT NULL,
  published_at  TEXT NOT NULL,
  exam_json     TEXT,             -- [{question, options[3], answer: 0..2}]
  podcast_url   TEXT,
  synced_at     TEXT              -- last fetch from the X API
);

CREATE TABLE thread_categories (
  thread_id     TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  position      INTEGER NOT NULL, -- 0 = primary category
  PRIMARY KEY (thread_id, category_slug)
);

CREATE TABLE tweets (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  likes      INTEGER NOT NULL DEFAULT 0,
  retweets   INTEGER NOT NULL DEFAULT 0,
  replies    INTEGER NOT NULL DEFAULT 0,
  quotes     INTEGER NOT NULL DEFAULT 0,
  bookmarks  INTEGER NOT NULL DEFAULT 0,
  views      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (thread_id, position)
);

CREATE TABLE media (
  tweet_id   TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('photo', 'video', 'gif')),
  url        TEXT NOT NULL, -- photo: local /metadata/... or remote; video/gif: mp4 URL
  poster_url TEXT,
  alt        TEXT,
  PRIMARY KEY (tweet_id, position)
);

CREATE TABLE links (
  tweet_id    TEXT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  domain      TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  image_url   TEXT,
  PRIMARY KEY (tweet_id, url)
);
CREATE INDEX links_url ON links(url);

CREATE TABLE quotes (
  tweet_id      TEXT PRIMARY KEY REFERENCES tweets(id) ON DELETE CASCADE,
  quoted_id     TEXT,
  author_handle TEXT,
  author_name   TEXT,
  text          TEXT NOT NULL,
  media_json    TEXT -- [{kind, url, poster_url}]
);
CREATE INDEX quotes_quoted_id ON quotes(quoted_id);

CREATE TABLE books (
  url             TEXT PRIMARY KEY, -- joins links.url for mentions
  title           TEXT NOT NULL,
  image_url       TEXT,
  categories_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE glossary (
  term       TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  reference  TEXT -- free text: "Véase X", a URL or a turra id
);

CREATE VIRTUAL TABLE search USING fts5(
  thread_id UNINDEXED,
  tweet_id UNINDEXED,
  text,
  tokenize = 'unicode61 remove_diacritics 2'
);
