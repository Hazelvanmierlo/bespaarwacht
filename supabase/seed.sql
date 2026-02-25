-- BespaarWacht Seed Data
-- Run after schema.sql to populate initial verzekeraars and demo premies

-- ============================================================
-- Verzekeraars
-- ============================================================
INSERT INTO verzekeraars (slug, naam, website, kleur, calculator_url, has_online_calculator, actief) VALUES
  ('inshared',        'InShared',           'https://www.inshared.nl',        '#E65100', 'https://www.inshared.nl/woonverzekering/inboedelverzekering', true, true),
  ('asr',             'a.s.r.',             'https://www.asr.nl',             '#0066CC', 'https://www.asr.nl/verzekeringen/inboedelverzekering/premie-berekenen', true, true),
  ('allianz-direct',  'Allianz Direct',     'https://www.allianzdirect.nl',   '#003781', 'https://www.allianzdirect.nl/woonverzekering/', true, true),
  ('centraal-beheer', 'Centraal Beheer',    'https://www.centraalbeheer.nl',  '#FF6600', 'https://www.centraalbeheer.nl/verzekeringen/inboedelverzekering', true, true),
  ('fbto',            'FBTO',               'https://www.fbto.nl',            '#003366', 'https://www.fbto.nl/verzekeringen/inboedelverzekering', true, true),
  ('zevenwouden',     'Zevenwouden',        'https://www.zfriesland.nl',      '#1B5E20', 'https://www.zfriesland.nl/verzekering/inboedelverzekering', true, true),
  ('ohra',            'OHRA',               'https://www.ohra.nl',            '#E30613', 'https://www.ohra.nl/inboedelverzekering', true, true),
  ('interpolis',      'Interpolis',         'https://www.interpolis.nl',      '#FFB612', 'https://www.interpolis.nl/inboedelverzekering', true, true),
  ('nn',              'Nationale-Nederlanden','https://www.nn.nl',            '#FF6200', 'https://www.nn.nl/Verzekeringen/Inboedelverzekering.htm', true, true),
  ('unive',           'Univé',              'https://www.unive.nl',           '#009CDE', 'https://www.unive.nl/verzekeringen/inboedelverzekering', true, true),
  ('ditzo',           'Ditzo',              'https://www.ditzo.nl',           '#00A651', 'https://www.ditzo.nl/inboedelverzekering', true, true),
  ('aegon',           'Aegon',              'https://www.aegon.nl',           '#00205B', 'https://www.aegon.nl/particulier/verzekeringen/inboedelverzekering', true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Demo premies (profiel: Vrijstaand huis, 264m², Amstelveen 1186, Gezin, Extra Uitgebreid)
-- ============================================================
INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 7.16, 85.92, 'Extra Uitgebreid', '€ 0', 3, 'Jaarbeloning terug', 'Hoogste besparing',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'inshared';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 8.42, 101.04, 'Extra Uitgebreid', '€ 0', 4, 'MoneyView ★★★★★ prijs', 'Laagste premie',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'asr';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 9.30, 111.60, 'Extra Uitgebreid', '€ 0', 4, 'MoneyView ★★★★', 'Scherpe prijs',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'allianz-direct';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 11.85, 142.20, 'All Risk', '€ 0', 5, 'Consumentenbond 8,3', 'Beste uit de Test',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'centraal-beheer';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 12.10, 145.20, 'All Risk', '€ 0', 5, 'Consumentenbond 8,3', 'Beste uit de Test',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'fbto';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 12.74, 152.88, 'All Risk', '€ 0', 5, 'Consumentenbond 8,3', 'Beste uit de Test',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'zevenwouden';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 17.53, 210.36, 'Extra Uitgebreid / All Risk', '€ 250', 3, 'Independer 7,4', 'Je huidige verzekeraar',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'ohra';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 14.20, 170.40, 'All Risk', '€ 0', 4, 'Consumentenbond 7,8', 'Bekend merk',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'interpolis';

INSERT INTO premies (verzekeraar_id, product_type, premie_maand, premie_jaar, dekking, eigen_risico, beoordeling, beoordeling_bron, highlight, input_params)
SELECT v.id, 'inboedel', 13.50, 162.00, 'Uitgebreid', '€ 0', 4, 'Consumentenbond 7,6', 'Persoonlijk advies',
  '{"postcode":"1186","woningtype":"vrijstaand","oppervlakte":264,"gezin":"gezin","dekking":"extra_uitgebreid"}'::jsonb
FROM verzekeraars v WHERE v.slug = 'nn';

-- ============================================================
-- Admin user (placeholder — set password_hash via app registration)
-- ============================================================
INSERT INTO users (email, name, role, provider)
VALUES ('admin@bespaarwacht.nl', 'Admin', 'admin', 'email')
ON CONFLICT (email) DO NOTHING;
