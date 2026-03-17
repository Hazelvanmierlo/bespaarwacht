-- Add anonymized document storage to saved_analyses
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS geanonimiseerde_tekst TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS pii_count INTEGER DEFAULT 0;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'ok';
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS bedragen_json JSONB;
