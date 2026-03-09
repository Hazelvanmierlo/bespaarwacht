-- BespaarWacht: Energie leads tabel
-- Run dit in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ============================================================
-- Energie leads (WhatsApp overstap-aanvragen)
-- ============================================================
CREATE TABLE IF NOT EXISTS energie_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Contact
  telefoon TEXT NOT NULL,
  naam TEXT,
  adres TEXT,
  email TEXT,
  iban TEXT,
  iban_bank TEXT,

  -- Energie data
  leverancier_huidig TEXT,
  leverancier_nieuw TEXT,
  stroom_kwh_jaar INTEGER,
  gas_m3_jaar INTEGER,
  meter_type TEXT,                    -- 'enkel' | 'dubbel'
  ean_stroom TEXT,
  ean_gas TEXT,

  -- Financieel
  kosten_huidig_jaar NUMERIC(8,2),
  kosten_nieuw_jaar NUMERIC(8,2),
  besparing_jaar1 NUMERIC(8,2),
  besparing_basis NUMERIC(8,2),
  contract_type TEXT,                 -- 'variabel' | '1jaar' | '3jaar' | 'dynamisch'

  -- Tracking
  bron TEXT DEFAULT 'whatsapp',       -- 'whatsapp' | 'website'
  status TEXT DEFAULT 'aangevraagd',  -- 'aangevraagd' | 'bevestigd' | 'afgerond' | 'geannuleerd'
  affiliate_url TEXT,
  affiliate_clicked BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_telefoon ON energie_leads(telefoon);
CREATE INDEX IF NOT EXISTS idx_leads_status ON energie_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON energie_leads(created_at DESC);

-- RLS
ALTER TABLE energie_leads ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write leads (no public access)
-- Service role bypasses RLS automatically

-- Updated_at trigger
CREATE TRIGGER energie_leads_updated_at
  BEFORE UPDATE ON energie_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
