-- Daisycon affiliate tracking velden toevoegen aan energie_leads
ALTER TABLE energie_leads ADD COLUMN IF NOT EXISTS affiliate_url TEXT;
ALTER TABLE energie_leads ADD COLUMN IF NOT EXISTS daisycon_click_id TEXT;
ALTER TABLE energie_leads ADD COLUMN IF NOT EXISTS affiliate_bron TEXT DEFAULT 'mock';
-- affiliate_bron: 'mock' | 'daisycon'
