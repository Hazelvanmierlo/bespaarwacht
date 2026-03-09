/* pdfjs-dist is loaded dynamically to avoid SSR issues (DOMMatrix not defined) */
async function getPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

/* ── Types ── */
export interface EnergieData {
  leverancier: string | null;
  contractType: string | null;
  einddatum: string | null;
  eanElektriciteit: string | null;
  eanGas: string | null;

  /* Elektriciteit */
  verbruikKwhDal: number | null;
  verbruikKwhPiek: number | null;
  verbruikKwhTotaal: number | null;
  terugleveringKwh: number | null;

  /* Gas */
  verbruikGasM3: number | null;

  /* Kosten */
  kostenElektriciteitJaar: number | null;
  kostenGasJaar: number | null;
  kostenTotaalJaar: number | null;
  vastrecht: number | null;
  netbeheerkosten: number | null;

  /* Meta */
  bron: string;
  kwaliteit: DataKwaliteit;
  ontbrekendeVelden: string[];
}

export type DataKwaliteit = "goed" | "redelijk" | "beperkt";

export interface ParseResult {
  data: EnergieData;
  bestandsnaam: string;
}

/* ── Main parse function ── */
export async function parsePDF(file: File): Promise<ParseResult> {
  const pdfjsLib = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }

  const leverancier = detectLeverancier(fullText);
  let data: EnergieData;

  switch (leverancier) {
    case "Vattenfall":
      data = parseVattenfall(fullText);
      break;
    case "Coolblue Energie":
      data = parseCoolblue(fullText);
      break;
    case "Meterbeheer":
      data = parseMeterbeheerStatus(fullText);
      break;
    default:
      data = parseGeneric(fullText, leverancier);
  }

  data = enrichData(data);
  data.kwaliteit = calculateQuality(data);

  return { data, bestandsnaam: file.name };
}

/* ── Leverancier detection ── */
function detectLeverancier(text: string): string | null {
  const lower = text.toLowerCase();
  const mappings: [string[], string][] = [
    [["vattenfall", "nuon"], "Vattenfall"],
    [["coolblue energie", "coolblue"], "Coolblue Energie"],
    [["eneco"], "Eneco"],
    [["essent"], "Essent"],
    [["greenchoice"], "Greenchoice"],
    [["budget energie"], "Budget Energie"],
    [["engie"], "ENGIE"],
    [["tibber"], "Tibber"],
    [["vandebron"], "Vandebron"],
    [["next energy", "nextenergy"], "NextEnergy"],
    [["frank energie"], "Frank Energie"],
    [["meterbeheer", "meterstand"], "Meterbeheer"],
  ];
  for (const [keywords, name] of mappings) {
    if (keywords.some((k) => lower.includes(k))) return name;
  }
  return null;
}

/* ── Helpers ── */
function findNumber(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

function findEAN(text: string, label: string): string | null {
  const re = new RegExp(`${label}[^0-9]*(\\d{18})`, "i");
  const m = text.match(re);
  return m ? m[1] : null;
}

/* ── Specific parsers ── */
function parseVattenfall(text: string): EnergieData {
  return {
    leverancier: "Vattenfall",
    contractType: text.toLowerCase().includes("vast") ? "Vast" : "Variabel",
    einddatum: extractDate(text),
    eanElektriciteit: findEAN(text, "ean.*elektr") || findEAN(text, "ean"),
    eanGas: findEAN(text, "ean.*gas"),
    verbruikKwhDal: findNumber(text, [/dal[^0-9]*(\d[\d.,]*)\s*kwh/i, /laagtarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhPiek: findNumber(text, [/piek[^0-9]*(\d[\d.,]*)\s*kwh/i, /hoogtarief[^0-9]*(\d[\d.,]*)/i, /normaaltarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhTotaal: findNumber(text, [/totaal[^0-9]*(\d[\d.,]*)\s*kwh/i, /verbruik[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    terugleveringKwh: findNumber(text, [/teruglevering[^0-9]*(\d[\d.,]*)\s*kwh/i, /terug[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    verbruikGasM3: findNumber(text, [/gas[^0-9]*(\d[\d.,]*)\s*m[³3]/i, /(\d[\d.,]*)\s*m[³3]/i]),
    kostenElektriciteitJaar: findNumber(text, [/elektr[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenGasJaar: findNumber(text, [/gas[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenTotaalJaar: findNumber(text, [/totaal[^0-9]*€?\s*(\d[\d.,]*)/i, /jaarbedrag[^0-9]*€?\s*(\d[\d.,]*)/i]),
    vastrecht: findNumber(text, [/vastrecht[^0-9]*€?\s*(\d[\d.,]*)/i, /vast[^0-9]*recht[^0-9]*€?\s*(\d[\d.,]*)/i]),
    netbeheerkosten: findNumber(text, [/netbeheer[^0-9]*€?\s*(\d[\d.,]*)/i]),
    bron: "Vattenfall PDF",
    kwaliteit: "redelijk",
    ontbrekendeVelden: [],
  };
}

function parseCoolblue(text: string): EnergieData {
  return {
    leverancier: "Coolblue Energie",
    contractType: text.toLowerCase().includes("vast") ? "Vast" : "Variabel",
    einddatum: extractDate(text),
    eanElektriciteit: findEAN(text, "ean"),
    eanGas: findEAN(text, "ean.*gas"),
    verbruikKwhDal: findNumber(text, [/dal[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhPiek: findNumber(text, [/piek[^0-9]*(\d[\d.,]*)/i, /normaal[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    verbruikKwhTotaal: findNumber(text, [/totaal[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    terugleveringKwh: findNumber(text, [/teruglevering[^0-9]*(\d[\d.,]*)/i]),
    verbruikGasM3: findNumber(text, [/gas[^0-9]*(\d[\d.,]*)\s*m[³3]/i]),
    kostenElektriciteitJaar: findNumber(text, [/elektr[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenGasJaar: findNumber(text, [/gas[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenTotaalJaar: findNumber(text, [/totaal[^0-9]*€?\s*(\d[\d.,]*)/i]),
    vastrecht: findNumber(text, [/vastrecht[^0-9]*€?\s*(\d[\d.,]*)/i]),
    netbeheerkosten: findNumber(text, [/netbeheer[^0-9]*€?\s*(\d[\d.,]*)/i]),
    bron: "Coolblue Energie PDF",
    kwaliteit: "redelijk",
    ontbrekendeVelden: [],
  };
}

function parseMeterbeheerStatus(text: string): EnergieData {
  return {
    leverancier: null,
    contractType: null,
    einddatum: null,
    eanElektriciteit: findEAN(text, "ean.*elektr") || findEAN(text, "ean"),
    eanGas: findEAN(text, "ean.*gas"),
    verbruikKwhDal: findNumber(text, [/dal[^0-9]*(\d[\d.,]*)/i, /laagtarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhPiek: findNumber(text, [/piek[^0-9]*(\d[\d.,]*)/i, /hoogtarief[^0-9]*(\d[\d.,]*)/i, /normaaltarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhTotaal: findNumber(text, [/totaal[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    terugleveringKwh: findNumber(text, [/teruglevering[^0-9]*(\d[\d.,]*)/i, /terug[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    verbruikGasM3: findNumber(text, [/gas[^0-9]*(\d[\d.,]*)\s*m[³3]/i, /(\d[\d.,]*)\s*m[³3]/i]),
    kostenElektriciteitJaar: null,
    kostenGasJaar: null,
    kostenTotaalJaar: null,
    vastrecht: null,
    netbeheerkosten: null,
    bron: "Meterbeheer/Meterstand PDF",
    kwaliteit: "beperkt",
    ontbrekendeVelden: [],
  };
}

function parseGeneric(text: string, leverancier: string | null): EnergieData {
  return {
    leverancier,
    contractType: text.toLowerCase().includes("vast") ? "Vast" : text.toLowerCase().includes("variabel") ? "Variabel" : null,
    einddatum: extractDate(text),
    eanElektriciteit: findEAN(text, "ean"),
    eanGas: findEAN(text, "ean.*gas"),
    verbruikKwhDal: findNumber(text, [/dal[^0-9]*(\d[\d.,]*)/i, /laagtarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhPiek: findNumber(text, [/piek[^0-9]*(\d[\d.,]*)/i, /hoogtarief[^0-9]*(\d[\d.,]*)/i, /normaaltarief[^0-9]*(\d[\d.,]*)/i]),
    verbruikKwhTotaal: findNumber(text, [/totaal[^0-9]*(\d[\d.,]*)\s*kwh/i, /verbruik[^0-9]*(\d[\d.,]*)\s*kwh/i]),
    terugleveringKwh: findNumber(text, [/teruglevering[^0-9]*(\d[\d.,]*)/i]),
    verbruikGasM3: findNumber(text, [/gas[^0-9]*(\d[\d.,]*)\s*m[³3]/i, /(\d[\d.,]*)\s*m[³3]/i]),
    kostenElektriciteitJaar: findNumber(text, [/elektr[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenGasJaar: findNumber(text, [/gas[^0-9]*€?\s*(\d[\d.,]*)/i]),
    kostenTotaalJaar: findNumber(text, [/totaal[^0-9]*€?\s*(\d[\d.,]*)/i, /jaarbedrag[^0-9]*€?\s*(\d[\d.,]*)/i]),
    vastrecht: findNumber(text, [/vastrecht[^0-9]*€?\s*(\d[\d.,]*)/i]),
    netbeheerkosten: findNumber(text, [/netbeheer[^0-9]*€?\s*(\d[\d.,]*)/i]),
    bron: leverancier ? `${leverancier} PDF` : "Onbekende PDF",
    kwaliteit: "beperkt",
    ontbrekendeVelden: [],
  };
}

function extractDate(text: string): string | null {
  const m = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
  return m ? m[1] : null;
}

/* ── Enrichment ── */
function enrichData(data: EnergieData): EnergieData {
  // Calculate totaal kWh if missing
  if (!data.verbruikKwhTotaal && data.verbruikKwhDal != null && data.verbruikKwhPiek != null) {
    data.verbruikKwhTotaal = data.verbruikKwhDal + data.verbruikKwhPiek;
  }
  // Estimate dal/piek split if only totaal known (60/40 default)
  if (data.verbruikKwhTotaal && !data.verbruikKwhDal && !data.verbruikKwhPiek) {
    data.verbruikKwhDal = Math.round(data.verbruikKwhTotaal * 0.6);
    data.verbruikKwhPiek = Math.round(data.verbruikKwhTotaal * 0.4);
  }

  // Determine missing fields
  const velden: [keyof EnergieData, string][] = [
    ["verbruikKwhTotaal", "Elektriciteitsverbruik"],
    ["verbruikGasM3", "Gasverbruik"],
    ["kostenTotaalJaar", "Jaarkosten"],
    ["leverancier", "Leverancier"],
  ];
  data.ontbrekendeVelden = velden
    .filter(([key]) => data[key] == null)
    .map(([, label]) => label);

  return data;
}

/* ── Quality score ── */
function calculateQuality(data: EnergieData): DataKwaliteit {
  let score = 0;
  if (data.verbruikKwhTotaal != null) score += 2;
  if (data.verbruikKwhDal != null && data.verbruikKwhPiek != null) score += 1;
  if (data.verbruikGasM3 != null) score += 2;
  if (data.kostenTotaalJaar != null) score += 2;
  if (data.leverancier) score += 1;
  if (data.terugleveringKwh != null) score += 1;
  if (data.vastrecht != null) score += 1;

  if (score >= 7) return "goed";
  if (score >= 4) return "redelijk";
  return "beperkt";
}
