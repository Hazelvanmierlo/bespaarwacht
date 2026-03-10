-- Scraper health monitoring for energy price updates
CREATE TABLE IF NOT EXISTS energie_scraper_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leverancier TEXT NOT NULL,
  scrape_methode TEXT NOT NULL, -- 'html', 'pdf', 'headless', 'aggregator'
  status TEXT NOT NULL, -- 'success', 'error', 'timeout', 'blocked', 'redirect'
  url_gebruikt TEXT,
  url_redirect TEXT,
  tarieven_gevonden BOOLEAN DEFAULT false,
  tarief_stroom NUMERIC(6,4),
  tarief_gas NUMERIC(6,4),
  error_message TEXT,
  response_code INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE energie_scraper_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read energie_scraper_logs" ON energie_scraper_logs FOR SELECT USING (true);
CREATE POLICY "Service insert energie_scraper_logs" ON energie_scraper_logs FOR INSERT WITH CHECK (true);

CREATE INDEX idx_scraper_logs_leverancier ON energie_scraper_logs (leverancier, created_at DESC);
CREATE INDEX idx_scraper_logs_status ON energie_scraper_logs (status, created_at DESC);
