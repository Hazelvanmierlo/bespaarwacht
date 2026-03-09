import type { InboedelInput, OpstalInput, AansprakelijkheidInput, ReisInput } from "./base";

// ── Postcode risk factors (based on first 2 digits) ──
const POSTCODE_FACTORS: Record<string, number> = {
  "10": 1.15, "11": 1.10, "12": 1.05, // Amsterdam area
  "13": 1.05, "14": 1.00, "15": 1.00,
  "16": 0.95, "17": 0.95, "18": 0.90,
  "19": 0.95, "20": 1.10, "21": 1.05, // Den Haag/Rotterdam area
  "22": 1.05, "23": 1.10, "24": 1.05,
  "25": 1.05, "26": 1.00, "27": 0.95,
  "28": 0.95, "29": 0.95, "30": 1.15, // Utrecht area
  "31": 1.05, "32": 1.00, "33": 0.95,
  "34": 1.00, "35": 1.05, "36": 0.95,
  "37": 0.95, "38": 0.90, "39": 0.90,
  "40": 0.90, "41": 0.90, "42": 0.90, // Brabant
  "43": 0.90, "44": 0.90, "45": 0.90,
  "46": 0.90, "47": 0.90, "48": 0.85,
  "49": 0.85, "50": 0.90, "51": 0.90, // Limburg
  "52": 0.90, "53": 0.90, "54": 0.95,
  "55": 0.90, "56": 0.90, "57": 0.85,
  "58": 0.85, "59": 0.85, "60": 0.90, // Gelderland
  "61": 0.90, "62": 0.90, "63": 0.90,
  "64": 0.90, "65": 0.90, "66": 0.90,
  "67": 0.90, "68": 0.85, "69": 0.85,
  "70": 0.90, "71": 0.90, "72": 0.85, // Overijssel
  "73": 0.85, "74": 0.85, "75": 0.85,
  "76": 0.85, "77": 0.85, "78": 0.85, // Drenthe
  "79": 0.85, "80": 0.85, "81": 0.85,
  "82": 0.85, "83": 0.85, "84": 0.85,
  "85": 0.85, "86": 0.85, "87": 0.85, // Friesland
  "88": 0.85, "89": 0.85, "90": 0.85, // Groningen
  "91": 0.85, "92": 0.85, "93": 0.85,
  "94": 0.85, "95": 0.85, "96": 0.85,
  "97": 0.85, "98": 0.85, "99": 0.85,
};

// ── Woningtype factors ──
const WONINGTYPE_FACTORS: Record<string, number> = {
  vrijstaand: 1.30,
  tussenwoning: 1.00,
  hoekwoning: 1.10,
  appartement: 0.85,
};

// ── Dekking factors ──
const DEKKING_FACTORS: Record<string, number> = {
  basis: 0.60,
  uitgebreid: 0.80,
  extra_uitgebreid: 1.00,
  all_risk: 1.20,
};

// ── Dekking labels ──
const DEKKING_LABELS: Record<string, string> = {
  basis: "Basis",
  uitgebreid: "Uitgebreid",
  extra_uitgebreid: "Extra Uitgebreid",
  all_risk: "All Risk",
};

function getPostcodeFactor(postcode: string): number {
  const digits = postcode.replace(/\D/g, "").slice(0, 2);
  return POSTCODE_FACTORS[digits] ?? 1.00;
}

function getOppervlakteFactor(m2: number): number {
  // Linear scaling: 100m² = 1.0, 200m² = 1.5, 300m² = 1.9
  if (m2 <= 50) return 0.75;
  if (m2 <= 100) return 0.75 + (m2 - 50) * (0.25 / 50);
  if (m2 <= 200) return 1.00 + (m2 - 100) * (0.50 / 100);
  if (m2 <= 300) return 1.50 + (m2 - 200) * (0.40 / 100);
  return 1.90 + (m2 - 300) * (0.002);
}

function getBouwjaarFactor(bouwjaar: number): number {
  if (bouwjaar >= 2010) return 0.85;
  if (bouwjaar >= 2000) return 0.90;
  if (bouwjaar >= 1990) return 0.95;
  if (bouwjaar >= 1980) return 1.00;
  if (bouwjaar >= 1970) return 1.05;
  if (bouwjaar >= 1960) return 1.10;
  if (bouwjaar >= 1940) return 1.15;
  return 1.25; // pre-war
}

function roundPremie(premie: number): number {
  return Math.round(premie * 100) / 100;
}

// ── Inboedel premium calculation ──
export function calculateInboedelPremium(
  basePremie: number,
  input: InboedelInput
): number {
  const postcode = getPostcodeFactor(input.postcode);
  const woning = WONINGTYPE_FACTORS[input.woningtype] ?? 1.00;
  const opp = getOppervlakteFactor(input.oppervlakte);
  const gezin = input.gezin === "gezin" ? 1.00 : 0.85;
  const dekking = DEKKING_FACTORS[input.dekking] ?? 1.00;

  return roundPremie(basePremie * postcode * woning * opp * gezin * dekking);
}

// ── Opstal premium calculation ──
export function calculateOpstalPremium(
  basePremie: number,
  input: OpstalInput
): number {
  const postcode = getPostcodeFactor(input.postcode);
  const woning = WONINGTYPE_FACTORS[input.woningtype] ?? 1.00;
  const opp = getOppervlakteFactor(input.oppervlakte);
  const dekking = DEKKING_FACTORS[input.dekking] ?? 1.00;
  const bouwjaar = getBouwjaarFactor(input.bouwjaar);

  return roundPremie(basePremie * postcode * woning * opp * dekking * bouwjaar);
}

// ── Aansprakelijkheid premium calculation ──
export function calculateAansprakelijkheidPremium(
  basePremie: number,
  input: AansprakelijkheidInput
): number {
  const gezin = input.gezin === "gezin" ? 1.00 : 0.75;
  const postcode = getPostcodeFactor(input.postcode);
  // AVP has minimal regional variation
  const postcodeEffect = 1 + (postcode - 1) * 0.3;

  return roundPremie(basePremie * gezin * postcodeEffect);
}

// ── Reis premium calculation ──
export function calculateReisPremium(
  basePremie: number,
  input: ReisInput
): number {
  const gezinFactor = { alleenstaand: 0.65, paar: 0.85, gezin: 1.00 }[input.gezin] ?? 1.00;
  const doorlopend = input.doorlopend ? 1.00 : 0.40;
  const werelddeel = input.werelddeel === "wereld" ? 1.45 : 1.00;

  return roundPremie(basePremie * gezinFactor * doorlopend * werelddeel);
}

export function getDekkingLabel(dekking: string): string {
  return DEKKING_LABELS[dekking] ?? dekking;
}
