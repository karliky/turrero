-- Categories get a visible introduction (category page) and classification criteria
-- (what belongs, what does not, tie-breaks with neighbouring categories), also used by lib/ai.ts
ALTER TABLE categories ADD COLUMN intro TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN criteria TEXT NOT NULL DEFAULT '';
