-- Add step_log column for scraper diagnostic traces
ALTER TABLE scraper_runs ADD COLUMN IF NOT EXISTS step_log text[];
