-- Profile & Document Storage — 2026-03-13
-- Extend user profiles + prepare policy document storage

-- ── Extended user profile fields ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS huisnummer TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS woonplaats TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS geboortedatum DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS woningtype TEXT; -- 'appartement', 'tussenwoning', 'hoekwoning', 'vrijstaand', '2-onder-1-kap'
ALTER TABLE users ADD COLUMN IF NOT EXISTS gezinssamenstelling TEXT; -- 'alleenstaand', 'samenwonend', 'gezin'

-- ── Policy document reference ──
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS document_naam TEXT;
