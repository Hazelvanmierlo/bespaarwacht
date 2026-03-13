-- Account Portal Redesign — 2026-03-13
-- Add contract tracking, alert system, and contact info fields to saved_analyses

ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS einddatum DATE;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS polisnummer TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS verzekeraar_telefoon TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS verzekeraar_website TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS alert_gevonden BOOLEAN DEFAULT false;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS alert_alternatief TEXT;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS alert_besparing NUMERIC(8,2);
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS alert_datum TIMESTAMPTZ;
ALTER TABLE saved_analyses ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;

-- Index for monitoring cron job
CREATE INDEX IF NOT EXISTS idx_saved_analyses_monitoring ON saved_analyses (monitoring_active) WHERE monitoring_active = true;
-- Index for alert notifications
CREATE INDEX IF NOT EXISTS idx_saved_analyses_alerts ON saved_analyses (alert_gevonden, notified) WHERE alert_gevonden = true AND notified = false;
