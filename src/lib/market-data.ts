import type { Alternative } from "./types";
import type { ProductType } from "./scrapers/base";

// ── Inboedel alternatieven ──
// Exacte premies berekend voor profiel:
// Vrijstaand huis, 264 m², Amstelveen (1186), Gezin, Extra Uitgebreid / All Risk
export const ALTERNATIVES: Alternative[] = [
  {
    id: "asr",
    naam: "a.s.r.",
    premie: 8.42,
    dekking: "Extra Uitgebreid",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★★ prijs",
    highlight: "Laagste premie",
    url: "https://www.asr.nl/verzekeringen/inboedelverzekering/premie-berekenen",
    kleur: "#0066CC",
  },
  {
    id: "centraal-beheer",
    naam: "Centraal Beheer",
    premie: 11.85,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.centraalbeheer.nl/verzekeringen/inboedelverzekering",
    kleur: "#FF6600",
  },
  {
    id: "fbto",
    naam: "FBTO",
    premie: 12.10,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.fbto.nl/verzekeringen/inboedelverzekering",
    kleur: "#003366",
  },
  {
    id: "interpolis",
    naam: "Interpolis",
    premie: 13.40,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "Consumentenbond 7,6",
    highlight: "Rabobank-netwerk",
    url: "https://www.interpolis.nl/inboedelverzekering",
    kleur: "#FFB900",
  },
];

// ── Opstal alternatieven ──
const ALTERNATIVES_OPSTAL: Alternative[] = [
  {
    id: "asr",
    naam: "a.s.r.",
    premie: 9.50,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★★ prijs",
    highlight: "Laagste premie",
    url: "https://www.asr.nl/verzekeringen/opstalverzekering/premie-berekenen",
    kleur: "#0066CC",
  },
  {
    id: "centraal-beheer",
    naam: "Centraal Beheer",
    premie: 11.20,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.centraalbeheer.nl/verzekeringen/opstalverzekering",
    kleur: "#FF6600",
  },
  {
    id: "fbto",
    naam: "FBTO",
    premie: 12.30,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.fbto.nl/verzekeringen/opstalverzekering",
    kleur: "#003366",
  },
  {
    id: "interpolis",
    naam: "Interpolis",
    premie: 13.40,
    dekking: "All Risk",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "Consumentenbond 7,6",
    highlight: "Rabobank-netwerk",
    url: "https://www.interpolis.nl/opstalverzekering",
    kleur: "#FFB900",
  },
];

// ── Aansprakelijkheid alternatieven ──
const ALTERNATIVES_AANSPRAKELIJKHEID: Alternative[] = [
  {
    id: "allianz-direct",
    naam: "Allianz Direct",
    premie: 2.15,
    dekking: "Aansprakelijkheid Particulier",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★",
    highlight: "Online voordeel",
    url: "https://www.allianzdirect.nl/aansprakelijkheidsverzekering/",
    kleur: "#003781",
  },
  {
    id: "asr",
    naam: "a.s.r.",
    premie: 2.50,
    dekking: "Aansprakelijkheid Particulier",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★★ prijs",
    highlight: "Scherpe prijs",
    url: "https://www.asr.nl/verzekeringen/aansprakelijkheidsverzekering",
    kleur: "#0066CC",
  },
  {
    id: "fbto",
    naam: "FBTO",
    premie: 2.75,
    dekking: "Aansprakelijkheid Particulier",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.fbto.nl/verzekeringen/aansprakelijkheidsverzekering",
    kleur: "#003366",
  },
  {
    id: "centraal-beheer",
    naam: "Centraal Beheer",
    premie: 3.10,
    dekking: "Aansprakelijkheid Particulier",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.centraalbeheer.nl/verzekeringen/aansprakelijkheidsverzekering",
    kleur: "#FF6600",
  },
];

// ── Reis alternatieven ──
const ALTERNATIVES_REIS: Alternative[] = [
  {
    id: "allianz-direct",
    naam: "Allianz Direct",
    premie: 4.90,
    dekking: "Doorlopend Europa",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★",
    highlight: "Online voordeel",
    url: "https://www.allianzdirect.nl/reisverzekering/",
    kleur: "#003781",
  },
  {
    id: "asr",
    naam: "a.s.r.",
    premie: 5.60,
    dekking: "Doorlopend Europa",
    eigenRisico: "€ 0",
    beoordeling: 4,
    beoordelingBron: "MoneyView ★★★★★ prijs",
    highlight: "Scherpe prijs",
    url: "https://www.asr.nl/verzekeringen/reisverzekering",
    kleur: "#0066CC",
  },
  {
    id: "centraal-beheer",
    naam: "Centraal Beheer",
    premie: 6.80,
    dekking: "Doorlopend Europa",
    eigenRisico: "€ 0",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.centraalbeheer.nl/verzekeringen/reisverzekering",
    kleur: "#FF6600",
  },
  {
    id: "fbto",
    naam: "FBTO",
    premie: 7.25,
    dekking: "Doorlopend Europa",
    eigenRisico: "€ 50",
    beoordeling: 5,
    beoordelingBron: "Consumentenbond 8,3",
    highlight: "Beste uit de Test",
    url: "https://www.fbto.nl/verzekeringen/reisverzekering",
    kleur: "#003366",
  },
];

/** Get fallback alternatives for a product type */
export function getAlternativesFallback(productType: ProductType): Alternative[] {
  switch (productType) {
    case "opstal": return ALTERNATIVES_OPSTAL;
    case "aansprakelijkheid": return ALTERNATIVES_AANSPRAKELIJKHEID;
    case "reis": return ALTERNATIVES_REIS;
    default: return ALTERNATIVES;
  }
}

export const MARKET_SOURCE = "Consumentenbond okt 2025, MoneyView jun 2025, Lastenvrij jan 2026, Overstappen.nl";
