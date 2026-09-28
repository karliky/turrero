-- Glossary v2: one row per term with a short definition, an explanation, where it comes from, related
-- terms and the turras that explain it. Content comes from data/glossary/glossary.json (migration 0011).
DROP TABLE glossary;
CREATE TABLE glossary (
  slug          TEXT PRIMARY KEY,
  term          TEXT NOT NULL,
  short         TEXT NOT NULL,
  body          TEXT NOT NULL,
  origin        TEXT,
  group_name    TEXT NOT NULL,
  aliases_json  TEXT NOT NULL DEFAULT '[]', -- other names, linked in the turras
  related_json  TEXT NOT NULL DEFAULT '[]', -- slugs
  sources_json  TEXT NOT NULL DEFAULT '[]', -- [{threadId, tweetId}]
  domains_json  TEXT                        -- only Cynefin: [{name, text}]
);
