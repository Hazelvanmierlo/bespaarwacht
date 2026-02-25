-- BespaarWacht Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================================================
-- Verzekeraars
-- ============================================================
CREATE TABLE IF NOT EXISTS verzekeraars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  naam TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  kleur TEXT,
  affiliate_network TEXT,          -- 'awin' | 'daisycon' | 'tradedoubler' | 'tradetracker' | null
  affiliate_merchant_id TEXT,
  affiliate_url TEXT,
  calculator_url TEXT,
  has_online_calculator BOOLEAN DEFAULT true,
  actief BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Geschrapete premies
-- ============================================================
CREATE TABLE IF NOT EXISTS premies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verzekeraar_id UUID REFERENCES verzekeraars(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL DEFAULT 'inboedel',
  premie_maand NUMERIC(8,2) NOT NULL,
  premie_jaar NUMERIC(8,2),
  dekking TEXT,
  eigen_risico TEXT,
  beoordeling INTEGER,
  beoordeling_bron TEXT,
  highlight TEXT,
  input_params JSONB,              -- {postcode, woningtype, oppervlakte, etc}
  scraped_at TIMESTAMPTZ DEFAULT now(),
  is_valid BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_premies_verzekeraar ON premies(verzekeraar_id);
CREATE INDEX IF NOT EXISTS idx_premies_scraped_at ON premies(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_premies_product_type ON premies(product_type);

-- ============================================================
-- Scraper runs (logging)
-- ============================================================
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verzekeraar_id UUID REFERENCES verzekeraars(id) ON DELETE CASCADE,
  status TEXT NOT NULL,              -- 'success' | 'error' | 'timeout'
  premie_gevonden NUMERIC(8,2),
  duration_ms INTEGER,
  error_message TEXT,
  run_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_verzekeraar ON scraper_runs(verzekeraar_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_run_at ON scraper_runs(run_at DESC);

-- ============================================================
-- Users (managed by NextAuth, extended with role)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT,
  provider TEXT,                     -- 'google' | 'apple' | 'email'
  role TEXT DEFAULT 'user',          -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NextAuth accounts (OAuth providers)
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- ============================================================
-- NextAuth sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- NextAuth verification tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- ============================================================
-- Opgeslagen analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  verzekeraar_huidig TEXT,
  product_type TEXT,
  dekking TEXT,
  premie_huidig NUMERIC(8,2),
  beste_alternatief TEXT,
  max_besparing NUMERIC(8,2),
  monitoring_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_analyses_user ON saved_analyses(user_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE verzekeraars ENABLE ROW LEVEL SECURITY;
ALTER TABLE premies ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;

-- Public read for verzekeraars and premies
CREATE POLICY "Verzekeraars are publicly readable"
  ON verzekeraars FOR SELECT
  USING (true);

CREATE POLICY "Premies are publicly readable"
  ON premies FOR SELECT
  USING (true);

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- Users can read their own analyses
CREATE POLICY "Users can read own analyses"
  ON saved_analyses FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own analyses"
  ON saved_analyses FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Service role bypasses RLS for admin/scraper operations

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verzekeraars_updated_at
  BEFORE UPDATE ON verzekeraars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
