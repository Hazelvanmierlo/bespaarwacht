import type { PolisData } from "./types";
import type { ProductType } from "./scrapers/base";

/**
 * Detect product type from polis data based on the 'type' and 'dekking' fields.
 */
export function detectProductType(polis: PolisData): ProductType {
  const type = polis.type.toLowerCase();
  const dekking = polis.dekking.toLowerCase();

  if (type.includes("opstal") || type.includes("woonhuis") || type.includes("gebouw")) {
    return "opstal";
  }
  if (type.includes("aansprakelijk") || type.includes("avp") || dekking.includes("aansprakelijk")) {
    return "aansprakelijkheid";
  }
  if (type.includes("reis") || type.includes("travel") || dekking.includes("reis")) {
    return "reis";
  }
  return "inboedel";
}

/**
 * Detect product type from raw PDF text (before structured parsing).
 */
export function detectProductTypeFromText(text: string): ProductType {
  const lower = text.toLowerCase();

  if (lower.includes("opstalverzekering") || lower.includes("woonhuisverzekering") || lower.includes("gebouwverzekering")) {
    return "opstal";
  }
  if (lower.includes("aansprakelijkheidsverzekering") || lower.includes("avp-verzekering") || lower.includes("aansprakelijkheid particulier")) {
    return "aansprakelijkheid";
  }
  if (lower.includes("reisverzekering") || lower.includes("doorlopende reis")) {
    return "reis";
  }
  return "inboedel";
}

/**
 * Extract structured PolisData from raw PDF text using regex patterns
 * for Dutch insurance policy documents.
 *
 * All patterns use [^\n] instead of [\s\S] to avoid matching across lines.
 */
export function extractPolisFromText(text: string): PolisData | null {
  if (!text || text.trim().length < 50) return null;

  const verzekeraar = extractField(text, [
    // Check specific brand names FIRST (before generic labels that match footer text)
    /\b(OHRA|Centraal Beheer|Interpolis|FBTO|Allianz Direct|InShared|Zevenwouden|Univé|Nationale[- ]Nederlanden|Aegon|Ditzo)\b/i,
    /(a\.s\.r\.)/i,
    /\b(ASR)\s+Schadeverzekering/i,
    // Generic labels last (can match footer text like "Maatschappij N.V. KvK...")
    /(?:Verzekeraar|Aanbieder|Verzekerd bij)[:\s]*([^\n]{2,40})/im,
  ]);

  const type = extractField(text, [
    /\b(Inboedelverzekering|Opstalverzekering|Woonhuisverzekering|Aansprakelijkheidsverzekering|Reisverzekering)\b/i,
    /(?:Product|Verzekering)[:\s]*([^\n]*verzekering)/im,
  ]);

  const dekking = extractField(text, [
    /(?:Dekkingsvorm|Pakket)[:\s]*([^\n]+)/im,
    /\b(All Risk|Extra Uitgebreid|Uitgebreid|Basis|Doorlopend Europa|Doorlopend Wereld)\b/i,
    /\b(Aansprakelijkheid voor particulieren)\b/i,
    /Dekkingsgebied[:\s]*([^\n]+)/im,
  ]);

  const postcode = extractField(text, [
    /(?:Postcode|woonplaats)[^\n]*?(\d{4}\s?[A-Z]{2})\b/i,
    /(?:Adres|Straat)[^\n]*\n[^\n]*?(\d{4}\s?[A-Z]{2})\b/im,
    /\b(\d{4}\s?[A-Z]{2})\s+[A-Z]{2,}/,
  ]);

  const woonplaats = extractField(text, [
    /(?:Woonplaats|woonplaats)[^\n]*?\d{4}\s?[A-Z]{2}\s+([A-Z][A-Za-z-]+)/i,
    /(?:Woonplaats|Plaats)[:\s]*([^\n]+)/im,
    /\b\d{4}\s?[A-Z]{2}\s+([A-Z]{2,}[A-Za-z-]*)/,
  ]);

  const naam = extractField(text, [
    /(?:Volledige naam|Naam verzekeringnemer)[:\s]*([^\n]+)/im,
    /(?<!handelsnaam van[^\n]*)(?:Naam)[:\s]*([^\n]+)/im,
    /Verzekeringnemer\s*\n\s*([^\n]+)/im,
  ]);

  const adres = extractField(text, [
    /(?:Adres|Straat)[:\s]*([^\n]+)/im,
  ]);

  const polisnummer = extractField(text, [
    /(?:Polisnummer|Polis nr|Polisnr)[.:\s]*([\d][\d-]+)/i,
  ]);

  const jaarpremieStr = extractField(text, [
    /(?:Jaarpremie|Premie per jaar|Totaalpremie)[:\s]*(?:EUR|€)?\s*([\d.,]+)/i,
    /(?:Jaarpremie|Premie per jaar|Totaalpremie)[^\n]*?(?:EUR|€)\s*([\d.,]+)/i,
  ]);
  const jaarpremie = parseAmount(jaarpremieStr);

  const maandpremieStr = extractField(text, [
    /(?:Maandpremie|Premie per maand)[:\s]*(?:EUR|€)?\s*([\d.,]+)/i,
    /(?:Premie per maand)[^\n]*?(?:EUR|€)\s*([\d.,]+)/i,
    /(?:EUR|€)\s*([\d.,]+)\s*(?:per maand|\/mnd|p\/m)/i,
    /(?:Uw termijnbedrag|Termijnbedrag)[^\n]*?(?:EUR|€)\s*([\d.,]+)/i,
  ]);
  const maandpremie = parseAmount(maandpremieStr) || (jaarpremie ? +(jaarpremie / 12).toFixed(2) : 0);

  const eigenRisico = extractField(text, [
    /(?:Eigen risico|Eigen-risico)[:\s]*(?:EUR|€)?\s*([\d.,]+)/i,
    // OHRA format: "Eigen Risico" header, amount on next line(s)
    /Eigen Risico[^\n]*\n[^\n]*?(?:EUR|€)\s*([\d.,]+)/im,
  ]);

  const ingangsdatum = extractField(text, [
    /(?:Ingangsdatum|Aanvangsdatum|Startdatum|Geldig vanaf)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /verzekering loopt vanaf\s+(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ]);

  const opzegtermijn = extractField(text, [
    /(?:Opzegtermijn)[:\s]*([^\n]+)/im,
    /\b(Dagelijks opzegbaar|1 maand|2 maanden|3 maanden)\b/i,
    /iedere maand be[ëe]indigen/i,
  ]);

  const woning = extractField(text, [
    /(?:Woningtype|Type woning|Soort woning)[:\s]*([^\n]+)/im,
    /\b(Vrijstaand|Tussenwoning|Hoekwoning|Appartement|2-onder-1-kap)\b/i,
  ]);

  const oppervlakte = extractField(text, [
    /(\d+)\s*m[²2]/,
    /(?:Oppervlakte|Woonoppervlakte)[:\s]*(\d+)/i,
  ]);

  const bouwaard = extractField(text, [
    /(?:Bouwaard|Constructie)[:\s]*([^\n]+)/im,
  ]);

  const huisnummer = extractHuisnummer(adres || text);

  const geboortedatum = extractField(text, [
    /(?:Geboortedatum|Geb\.?)\s*[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:Geboren)\s*[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ]);

  const eigenaarStr = extractField(text, [
    /\b(Eigendom|Eigenaar|Huurder|Huur)\b/i,
    /(?:Eigendom\/huur|Eigenaar\/huurder)[:\s]*([^\n]+)/im,
  ]);

  const gezin = extractField(text, [
    /(?:Gezinssamenstelling|Gezin|Samenstelling)[:\s]*([^\n]+)/im,
    /\b(Gezin \/ samenwonend|Gezin|Alleenstaand|Samenwonend|Eenpersoons|Meerpersoonshuishouden)\b/i,
    /(?:Verzekerden)\s*\n\s*(Eenpersoons|Gezin|Alleenstaand|Meerpersoonshuishouden)/im,
  ]);

  const voorwaarden = extractField(text, [
    /(?:Voorwaardennr|Voorwaarden nr)[.:\s]*([\w\d][\w\d\s.-]+)/i,
    /(?:Polisvoorwaarden|Voorwaarden)[^\n]*\n\s*-\s*([^\n]+)/im,
    /\bVoorwaarden\b[^\n]*\n\s*([A-Z]{2,5}\d{2,6})\b/im,
  ]);

  // Only return if we found at least a premium or verzekeraar
  if (!verzekeraar && !jaarpremie && !maandpremie) return null;

  return {
    naam: naam || "",
    adres: adres || "",
    postcode: postcode || "",
    woonplaats: woonplaats || "",
    polisnummer: polisnummer || "",
    verzekeraar: verzekeraar || "Onbekend",
    type: type || "Onbekend",
    dekking: dekking || "Onbekend",
    voorwaarden: voorwaarden || "",
    jaarpremie: jaarpremie || maandpremie * 12,
    maandpremie: maandpremie || (jaarpremie ? +(jaarpremie / 12).toFixed(2) : 0),
    premie_periode: "onbekend",
    eigenRisico: eigenRisico ? `€ ${eigenRisico}` : "€ 0",
    ingangsdatum: ingangsdatum || "",
    verlengingsdatum: "",
    opzegtermijn: opzegtermijn || "",
    gezin: gezin || "",
    woning: woning || "",
    bouwaard: bouwaard || "",
    oppervlakte: oppervlakte ? `${oppervlakte} m²` : "",
    huisnummer: huisnummer || "",
    geboortedatum: geboortedatum || "",
    eigenaar: eigenaarStr ? (eigenaarStr.toLowerCase().includes("huur") ? "Huurder" : "Eigenaar") : "",
    dekkingen: [],
  };
}

function extractField(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] ?? match[0]).trim();
    }
  }
  return "";
}

function extractHuisnummer(text: string): string {
  // Try to find house number from address line: "Straatnaam 107" or "Straat 12a"
  const match = text.match(/(?:Adres|Straat)[^\n]*?[a-zA-Zé]\s+(\d+[a-zA-Z]?)\b/i)
    || text.match(/[A-Za-z]+(?:straat|laan|weg|dijk|gracht|kade|plein|singel|pad)\s+(?:[A-Za-z]+\s+)?(\d+[a-zA-Z]?)\b/i)
    || text.match(/[A-Za-z]+\s+(\d+[a-zA-Z]?)\s*\n\s*\d{4}\s?[A-Z]{2}/);
  return match?.[1] || "";
}

function parseAmount(str: string): number {
  if (!str) return 0;
  // Dutch format: 1.234,56 or 1234,56
  const cleaned = str.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
