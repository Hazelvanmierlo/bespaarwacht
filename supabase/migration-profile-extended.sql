-- Extended profile fields: auto-filled from document PII extraction
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefoon TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS adres TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pii_bron TEXT DEFAULT 'handmatig';
-- pii_bron: 'handmatig' = user typed it, 'document' = extracted from uploaded PDF
