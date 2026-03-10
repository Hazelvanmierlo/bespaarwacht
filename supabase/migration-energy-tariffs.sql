-- Energy tariffs table for automated price updates
CREATE TABLE IF NOT EXISTS energie_tarieven (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leverancier TEXT NOT NULL,
  contract_type TEXT NOT NULL, -- Variabel, 1jaar, 3jaar, Dynamisch
  tarief_stroom_normaal NUMERIC(6,4),
  tarief_stroom_dal NUMERIC(6,4),
  tarief_gas NUMERIC(6,4),
  vastrecht_stroom NUMERIC(6,2),
  vastrecht_gas NUMERIC(6,2),
  bron TEXT DEFAULT 'cron',
  geldig_vanaf DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(leverancier, contract_type, geldig_vanaf)
);

-- Public read access
ALTER TABLE energie_tarieven ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read energie_tarieven" ON energie_tarieven FOR SELECT USING (true);
CREATE POLICY "Service role insert energie_tarieven" ON energie_tarieven FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_energie_tarieven_leverancier ON energie_tarieven (leverancier, geldig_vanaf DESC);
