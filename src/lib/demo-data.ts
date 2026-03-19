import type { PolisData } from "./types";
import type { ProductType } from "./scrapers/base";

// ── Inboedel demo polis ──
export const demoPolisData: PolisData = {
  naam: "C.J.J. Gobel",
  adres: "Amsteldijk Zuid 107",
  postcode: "1186VH",
  woonplaats: "AMSTELVEEN",
  polisnummer: "6494572-315-400",
  verzekeraar: "OHRA",
  type: "Inboedelverzekering",
  dekking: "Extra Uitgebreid / All Risk",
  voorwaarden: "INB2207",
  jaarpremie: 173.88,
  maandpremie: 17.53,
  premie_periode: "maand",
  eigenRisico: "€ 250 (storm/neerslag/stortbui)",
  ingangsdatum: "01-08-2014",
  verlengingsdatum: "01-08-2025",
  opzegtermijn: "Dagelijks opzegbaar",
  gezin: "Gezin / samenwonend",
  woning: "Vrijstaand, Eigendom",
  bouwaard: "Steen/Hout, Pannen dak",
  oppervlakte: "264 m²",
  huisnummer: "107",
  geboortedatum: "05-04-1991",
  eigenaar: "Eigenaar",
  dekkingen: [
    { rubriek: "Huisraad", diefstal: "Waardegarantie", anders: "Waardegarantie" },
    { rubriek: "Audio/computer", diefstal: "€ 15.000", anders: "Waardegarantie" },
    { rubriek: "Kunst en antiek", diefstal: "€ 15.000", anders: "Waardegarantie" },
    { rubriek: "Lijfsieraden", diefstal: "€ 6.000", anders: "Waardegarantie" },
    { rubriek: "Instrumenten", diefstal: "€ 15.000", anders: "Waardegarantie" },
    { rubriek: "Bijzondere verzamelingen", diefstal: "€ 15.000", anders: "Waardegarantie" },
  ],
};

// ── Opstal demo polis ──
export const demoPolisOpstal: PolisData = {
  naam: "C.J.J. Gobel",
  adres: "Amsteldijk Zuid 107",
  postcode: "1186VH",
  woonplaats: "AMSTELVEEN",
  polisnummer: "6494572-315-401",
  verzekeraar: "OHRA",
  type: "Opstalverzekering",
  dekking: "All Risk",
  voorwaarden: "OPS2207",
  jaarpremie: 228.00,
  maandpremie: 19.00,
  premie_periode: "maand",
  eigenRisico: "€ 250",
  ingangsdatum: "01-08-2014",
  verlengingsdatum: "01-08-2025",
  opzegtermijn: "Dagelijks opzegbaar",
  gezin: "Gezin / samenwonend",
  woning: "Vrijstaand, Eigendom",
  bouwaard: "Steen/Hout, Pannen dak",
  oppervlakte: "264 m²",
  huisnummer: "107",
  geboortedatum: "05-04-1991",
  eigenaar: "Eigenaar",
  dekkingen: [
    { rubriek: "Gebouw", diefstal: "n.v.t.", anders: "Herbouwwaarde" },
    { rubriek: "Fundering", diefstal: "n.v.t.", anders: "Herbouwwaarde" },
  ],
};

// ── Aansprakelijkheid demo polis ──
export const demoPolisAansprakelijkheid: PolisData = {
  naam: "C.J.J. Gobel",
  adres: "Amsteldijk Zuid 107",
  postcode: "1186VH",
  woonplaats: "AMSTELVEEN",
  polisnummer: "6494572-315-402",
  verzekeraar: "Centraal Beheer",
  type: "Aansprakelijkheidsverzekering",
  dekking: "Aansprakelijkheid Particulier",
  voorwaarden: "AVP2301",
  jaarpremie: 52.80,
  maandpremie: 4.40,
  premie_periode: "maand",
  eigenRisico: "€ 0",
  ingangsdatum: "01-01-2020",
  verlengingsdatum: "01-01-2026",
  opzegtermijn: "Dagelijks opzegbaar",
  gezin: "Gezin / samenwonend",
  woning: "Vrijstaand, Eigendom",
  bouwaard: "",
  oppervlakte: "",
  huisnummer: "107",
  geboortedatum: "05-04-1991",
  eigenaar: "",
  dekkingen: [
    { rubriek: "Aansprakelijkheid", diefstal: "n.v.t.", anders: "€ 1.250.000" },
  ],
};

// ── Reis demo polis ──
export const demoPolisReis: PolisData = {
  naam: "C.J.J. Gobel",
  adres: "Amsteldijk Zuid 107",
  postcode: "1186VH",
  woonplaats: "AMSTELVEEN",
  polisnummer: "6494572-315-403",
  verzekeraar: "FBTO",
  type: "Reisverzekering",
  dekking: "Doorlopend Europa",
  voorwaarden: "REI2301",
  jaarpremie: 120.00,
  maandpremie: 10.00,
  premie_periode: "maand",
  eigenRisico: "€ 50",
  ingangsdatum: "01-03-2022",
  verlengingsdatum: "01-03-2026",
  opzegtermijn: "1 maand",
  gezin: "Gezin / samenwonend",
  woning: "",
  bouwaard: "",
  oppervlakte: "",
  huisnummer: "",
  geboortedatum: "05-04-1991",
  eigenaar: "",
  dekkingen: [
    { rubriek: "Bagage", diefstal: "€ 2.500", anders: "€ 5.000" },
    { rubriek: "Medisch", diefstal: "n.v.t.", anders: "Onbeperkt" },
  ],
};

/** Get demo polis data for a product type */
export function getDemoPolisData(productType: ProductType): PolisData {
  switch (productType) {
    case "opstal": return demoPolisOpstal;
    case "aansprakelijkheid": return demoPolisAansprakelijkheid;
    case "reis": return demoPolisReis;
    default: return demoPolisData;
  }
}
