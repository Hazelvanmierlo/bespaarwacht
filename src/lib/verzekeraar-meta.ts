import type { Alternative } from "./types";
import type { ProductType } from "./scrapers/base";

type MetaEntry = Omit<Alternative, "id" | "premie" | "dekking" | "eigenRisico">;

/** Base metadata shared across products */
const BASE_META: Record<string, Pick<MetaEntry, "naam" | "beoordeling" | "beoordelingBron" | "kleur">> = {
  inshared: { naam: "InShared", beoordeling: 3, beoordelingBron: "Jaarbeloning terug", kleur: "#E65100" },
  asr: { naam: "a.s.r.", beoordeling: 4, beoordelingBron: "MoneyView \u2605\u2605\u2605\u2605\u2605 prijs", kleur: "#0066CC" },
  "allianz-direct": { naam: "Allianz Direct", beoordeling: 4, beoordelingBron: "MoneyView \u2605\u2605\u2605\u2605", kleur: "#003781" },
  "centraal-beheer": { naam: "Centraal Beheer", beoordeling: 5, beoordelingBron: "Consumentenbond 8,3", kleur: "#FF6600" },
  fbto: { naam: "FBTO", beoordeling: 5, beoordelingBron: "Consumentenbond 8,3", kleur: "#003366" },
  zevenwouden: { naam: "Zevenwouden", beoordeling: 5, beoordelingBron: "Consumentenbond 8,3", kleur: "#1B5E20" },
  ohra: { naam: "OHRA", beoordeling: 4, beoordelingBron: "Consumentenbond 7,8", kleur: "#E30613" },
  interpolis: { naam: "Interpolis", beoordeling: 4, beoordelingBron: "Consumentenbond 7,6", kleur: "#FFB900" },
  nn: { naam: "Nationale-Nederlanden", beoordeling: 4, beoordelingBron: "Consumentenbond 7,5", kleur: "#FF6600" },
  unive: { naam: "Univé", beoordeling: 4, beoordelingBron: "Consumentenbond 7,7", kleur: "#009CDE" },
  ditzo: { naam: "Ditzo", beoordeling: 3, beoordelingBron: "Budget-keuze", kleur: "#00A651" },
  aegon: { naam: "Aegon", beoordeling: 4, beoordelingBron: "MoneyView \u2605\u2605\u2605\u2605", kleur: "#003B71" },
};

/** Short USP per verzekeraar (for result cards) */
export const VERZEKERAAR_USP: Record<string, string> = {
  inshared: "Geen schade? Jaarbeloning terug. 100% online.",
  asr: "Scherpe premie, uitgebreide dekking. MoneyView Beste Prijs.",
  "allianz-direct": "Direct online afsluiten. Geen tussenpersoon, lagere kosten.",
  "centraal-beheer": "Beste verzekeraar Consumentenbond. Uitstekende klantenservice.",
  fbto: "Top-score Consumentenbond. Flexibele dekkingen, snel online.",
  zevenwouden: "Hoge klanttevredenheid. Onderdeel Achmea, lokale service.",
  ohra: "Jarenlange ervaring, betrouwbare afhandeling.",
  interpolis: "Kristalhelder verzekerd. Via Rabobank, breed netwerk.",
  nn: "Groot en betrouwbaar. Uitgebreid productaanbod.",
  unive: "Coöperatie zonder winstoogmerk. Regionale betrokkenheid.",
  ditzo: "Budget-keuze voor wie alleen basisdekking nodig heeft.",
  aegon: "Internationale verzekeraar. Solide financiële basis.",
};

/** Contact info per verzekeraar — for "Vragen of schade?" redirect */
export const VERZEKERAAR_CONTACT: Record<string, { telefoon: string; website: string; openingstijden: string }> = {
  inshared: { telefoon: "020 760 25 00", website: "https://www.inshared.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  asr: { telefoon: "030 257 91 11", website: "https://www.asr.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  "allianz-direct": { telefoon: "088 577 47 74", website: "https://www.allianzdirect.nl/contact/", openingstijden: "Ma-Vr 8:00-20:00" },
  "centraal-beheer": { telefoon: "055 579 81 00", website: "https://www.centraalbeheer.nl/contact", openingstijden: "Ma-Vr 8:00-18:00, Za 9:00-13:00" },
  fbto: { telefoon: "058 291 31 13", website: "https://www.fbto.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  zevenwouden: { telefoon: "0513 678 900", website: "https://www.zevenwouden.nl/contact", openingstijden: "Ma-Vr 8:00-17:00" },
  ohra: { telefoon: "026 400 42 42", website: "https://www.ohra.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  interpolis: { telefoon: "013 462 20 00", website: "https://www.interpolis.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  nn: { telefoon: "070 513 78 00", website: "https://www.nn.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  unive: { telefoon: "0592 74 13 41", website: "https://www.unive.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  ditzo: { telefoon: "030 799 39 10", website: "https://www.ditzo.nl/contact", openingstijden: "Ma-Vr 8:00-17:30" },
  aegon: { telefoon: "070 344 32 10", website: "https://www.aegon.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
};

/** Lookup contact info by verzekeraar name (fuzzy match on slug) */
export function getContactByName(naam: string): { telefoon: string; website: string; openingstijden: string } | null {
  const lower = naam.toLowerCase();
  for (const [slug, contact] of Object.entries(VERZEKERAAR_CONTACT)) {
    const meta = BASE_META[slug];
    if (meta && (meta.naam.toLowerCase() === lower || lower.includes(slug.replace("-", " ")) || lower.includes(meta.naam.toLowerCase()))) {
      return contact;
    }
  }
  return null;
}

/** Product-specific metadata (url + highlight) */
const PRODUCT_META: Record<ProductType, Record<string, { url: string; highlight: string }>> = {
  inboedel: {
    asr: { url: "https://www.asr.nl/verzekeringen/inboedelverzekering/premie-berekenen", highlight: "Laagste premie" },
    "centraal-beheer": { url: "https://www.centraalbeheer.nl/verzekeringen/inboedelverzekering", highlight: "Beste uit de Test" },
    fbto: { url: "https://www.fbto.nl/verzekeringen/inboedelverzekering", highlight: "Beste uit de Test" },
    interpolis: { url: "https://www.interpolis.nl/inboedelverzekering", highlight: "Rabobank-netwerk" },
  },
  opstal: {
    "centraal-beheer": { url: "https://www.centraalbeheer.nl/verzekeringen/opstalverzekering", highlight: "Beste uit de Test" },
    asr: { url: "https://www.asr.nl/verzekeringen/opstalverzekering/premie-berekenen", highlight: "Laagste premie" },
    fbto: { url: "https://www.fbto.nl/verzekeringen/opstalverzekering", highlight: "Beste uit de Test" },
    interpolis: { url: "https://www.interpolis.nl/opstalverzekering", highlight: "Rabobank-netwerk" },
  },
  aansprakelijkheid: {
    "centraal-beheer": { url: "https://www.centraalbeheer.nl/verzekeringen/aansprakelijkheidsverzekering", highlight: "Beste uit de Test" },
    asr: { url: "https://www.asr.nl/verzekeringen/aansprakelijkheidsverzekering", highlight: "Scherpe prijs" },
    "allianz-direct": { url: "https://www.allianzdirect.nl/aansprakelijkheidsverzekering/", highlight: "Online voordeel" },
    fbto: { url: "https://www.fbto.nl/verzekeringen/aansprakelijkheidsverzekering", highlight: "Beste uit de Test" },
  },
  reis: {
    "centraal-beheer": { url: "https://www.centraalbeheer.nl/verzekeringen/reisverzekering", highlight: "Beste uit de Test" },
    asr: { url: "https://www.asr.nl/verzekeringen/reisverzekering", highlight: "Scherpe prijs" },
    "allianz-direct": { url: "https://www.allianzdirect.nl/reisverzekering/", highlight: "Online voordeel" },
    fbto: { url: "https://www.fbto.nl/verzekeringen/reisverzekering", highlight: "Beste uit de Test" },
  },
};

/** Get merged metadata for a verzekeraar + product combo */
export function getVerzekeraarMeta(slug: string, productType: ProductType): MetaEntry | undefined {
  const base = BASE_META[slug];
  if (!base) return undefined;

  const product = PRODUCT_META[productType]?.[slug];
  return {
    ...base,
    url: product?.url ?? "",
    highlight: product?.highlight ?? "",
  };
}

/** Get all metadata entries for a product type (keyed by slug) */
export function getAllVerzekeraarMeta(productType: ProductType): Record<string, MetaEntry> {
  const result: Record<string, MetaEntry> = {};
  const productMeta = PRODUCT_META[productType] ?? {};

  for (const slug of Object.keys(productMeta)) {
    const base = BASE_META[slug];
    if (base) {
      result[slug] = {
        ...base,
        url: productMeta[slug].url,
        highlight: productMeta[slug].highlight,
      };
    }
  }
  return result;
}
