-- The podcast versions (public/podcast/*.mp3) were removed from the site
ALTER TABLE threads DROP COLUMN podcast_url;
