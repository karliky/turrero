-- Removes the turra "Airbnb: De un Honda Civic a la revolución hotelera" (@jlantunez, 2018) from the archive.
-- Deleting the thread cascades to its tweets, media, links, quotes and categories (foreign keys are on).
-- The search index has no foreign key, and the author has no other turra.
DELETE FROM search WHERE thread_id = '967375698976477184';
DELETE FROM threads WHERE id = '967375698976477184';
DELETE FROM authors WHERE handle = 'jlantunez' AND NOT EXISTS (SELECT 1 FROM threads WHERE author_handle = 'jlantunez');
