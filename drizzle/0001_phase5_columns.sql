ALTER TABLE scores ADD COLUMN youtube_id TEXT;
ALTER TABLE scores ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE scores ADD COLUMN athlete_id TEXT;
ALTER TABLE scores ADD COLUMN rep_taps TEXT;
