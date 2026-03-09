import type { PolisData } from "./types";
import type { ScraperInput, InboedelInput, OpstalInput, AansprakelijkheidInput, ReisInput, ProductType } from "./scrapers/base";

/**
 * Maps PolisData (from PDF extraction) to ScraperInput (for scrapers).
 * Product-aware: returns the correct input shape per product type.
 */
export function polisToScraperInput(polis: PolisData, productType: ProductType = "inboedel"): ScraperInput {
  switch (productType) {
    case "opstal":
      return polisToOpstalInput(polis);
    case "aansprakelijkheid":
      return polisToAansprakelijkheidInput(polis);
    case "reis":
      return polisToReisInput(polis);
    default:
      return polisToInboedelInput(polis);
  }
}

function polisToInboedelInput(polis: PolisData): InboedelInput {
  const input: InboedelInput = {
    postcode: polis.postcode.replace(/\D/g, "").slice(0, 4),
    woningtype: parseWoningtype(polis.woning),
    oppervlakte: parseInt(polis.oppervlakte.replace(/\D/g, ""), 10) || 100,
    gezin: parseGezin(polis.gezin),
    dekking: parseDekking(polis.dekking),
  };

  if (polis.huisnummer) {
    input.huisnummer = polis.huisnummer;
  }
  if (polis.geboortedatum) {
    input.geboortedatum = polis.geboortedatum;
  }
  if (polis.eigenaar) {
    input.eigenaar = polis.eigenaar.toLowerCase() !== "huurder";
  }

  return input;
}

function polisToOpstalInput(polis: PolisData): OpstalInput {
  const input: OpstalInput = {
    postcode: polis.postcode.replace(/\D/g, "").slice(0, 4),
    woningtype: parseWoningtype(polis.woning),
    oppervlakte: parseInt(polis.oppervlakte.replace(/\D/g, ""), 10) || 100,
    bouwjaar: parseBouwjaar(polis.bouwaard),
    dekking: parseDekking(polis.dekking),
  };

  if (polis.huisnummer) input.huisnummer = polis.huisnummer;
  if (polis.geboortedatum) input.geboortedatum = polis.geboortedatum;
  if (polis.eigenaar) input.eigenaar = polis.eigenaar.toLowerCase() !== "huurder";

  return input;
}

function polisToAansprakelijkheidInput(polis: PolisData): AansprakelijkheidInput {
  const input: AansprakelijkheidInput = {
    postcode: polis.postcode.replace(/\D/g, "").slice(0, 4),
    gezin: parseGezin(polis.gezin),
  };

  if (polis.huisnummer) input.huisnummer = polis.huisnummer;
  if (polis.geboortedatum) input.geboortedatum = polis.geboortedatum;

  return input;
}

function polisToReisInput(polis: PolisData): ReisInput {
  const input: ReisInput = {
    gezin: parseGezinReis(polis.gezin),
    doorlopend: polis.dekking.toLowerCase().includes("doorlopend"),
    werelddeel: polis.dekking.toLowerCase().includes("wereld") ? "wereld" : "europa",
  };

  if (polis.geboortedatum) input.geboortedatum = polis.geboortedatum;

  return input;
}

function parseWoningtype(
  woning: string
): InboedelInput["woningtype"] {
  const lower = woning.toLowerCase();
  if (lower.includes("vrijstaand")) return "vrijstaand";
  if (lower.includes("hoek")) return "hoekwoning";
  if (lower.includes("tussen")) return "tussenwoning";
  if (lower.includes("appartement") || lower.includes("flat")) return "appartement";
  return "tussenwoning";
}

function parseGezin(gezin: string): "alleenstaand" | "gezin" {
  const lower = gezin.toLowerCase();
  if (lower.includes("gezin") || lower.includes("samen") || lower.includes("meerpersoons")) return "gezin";
  return "alleenstaand";
}

function parseGezinReis(gezin: string): ReisInput["gezin"] {
  const lower = gezin.toLowerCase();
  if (lower.includes("gezin")) return "gezin";
  if (lower.includes("samen") || lower.includes("paar")) return "paar";
  return "alleenstaand";
}

function parseDekking(dekking: string): InboedelInput["dekking"] {
  const lower = dekking.toLowerCase();
  if (lower.includes("all risk")) return "all_risk";
  if (lower.includes("extra uitgebreid")) return "extra_uitgebreid";
  if (lower.includes("uitgebreid")) return "uitgebreid";
  return "basis";
}

function parseBouwjaar(bouwaard: string): number {
  // Try to extract a year from the bouwaard string
  const match = bouwaard.match(/\b(19|20)\d{2}\b/);
  if (match) return parseInt(match[0], 10);
  return 1990; // sensible default
}
