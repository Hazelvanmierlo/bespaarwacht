/**
 * Local PII anonymizer using Ollama (llama3.2).
 * Extracts text from PDF, sends to local LLM to identify and replace
 * personal data with tokens. The anonymized text can then safely be
 * sent to cloud APIs (Claude) for structured parsing.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

const ANONYMIZE_PROMPT = `Find personal data (PII) in this Dutch document. Return ONLY JSON, no explanation.

{"pii": [{"type": "NAAM", "value": "..."}, {"type": "ACHTERNAAM", "value": "..."}, ...]}

Types: NAAM (full name), ACHTERNAAM (last name if used separately like "meneer Van Mierlo"), ADRES (street+number), KLANTNUMMER, FACTUURNUMMER, EAN (18-digit energy code).
NOT PII: company names, company addresses, websites, dates, postcodes.
If nothing found: {"pii": []}

Text:
`;

export interface PiiItem {
  type: string;
  value: string;
}

export interface AnonymizeResult {
  anonymizedText: string;
  piiFound: PiiItem[];
  piiCount: number;
  /** PII values mapped to their replacement tokens */
  tokenMap: Record<string, string>;
}

/**
 * Check if Ollama is running and the model is available.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const models = data.models || [];
    return models.some((m: { name: string }) =>
      m.name.startsWith(OLLAMA_MODEL)
    );
  } catch {
    return false;
  }
}

/**
 * Send text to local Ollama to identify PII, then replace all PII
 * occurrences in the original text with tokens like [NAAM_1], [ADRES_1].
 */
export async function anonymizeWithOllama(
  rawText: string
): Promise<AnonymizeResult> {
  // Trim text to first ~1500 chars for PII detection — personal data
  // is almost always in the header/first page, not in boilerplate.
  const textForPii = rawText.slice(0, 1500);

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: ANONYMIZE_PROMPT + textForPii,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 1024,
      },
    }),
    signal: AbortSignal.timeout(120_000), // 120s timeout for Ollama
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const responseText = data.response || "";

  // Parse PII list from Ollama response
  let piiItems: PiiItem[] = [];
  try {
    const jsonStr = responseText.replace(/```json|```/g, "").trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      piiItems = Array.isArray(parsed.pii) ? parsed.pii : [];
    }
  } catch {
    // If Ollama response isn't valid JSON, fall back to regex-based detection
    piiItems = regexFallbackDetect(rawText);
  }

  // Filter out false positives from Ollama
  piiItems = piiItems.filter((item) => {
    if (!item.value || item.value.length < 2) return false;
    // Remove empty BSN values
    if (item.type === "BSN" && !item.value.trim()) return false;
    // Remove URLs mistakenly tagged as EMAIL
    if (item.type === "EMAIL" && !item.value.includes("@")) return false;
    // Remove non-PII data types Ollama sometimes hallucinates
    const validTypes = [
      "NAAM", "ACHTERNAAM", "ADRES", "POSTCODE", "WOONPLAATS",
      "IBAN", "BSN", "TELEFOONNUMMER", "EMAIL", "KLANTNUMMER",
      "FACTUURNUMMER", "POLISNUMMER", "EAN", "GEBOORTEDATUM", "DATUM",
    ];
    return validTypes.includes(item.type.toUpperCase());
  });

  // Normalize type names
  piiItems = piiItems.map((item) => ({
    ...item,
    type: item.type.toUpperCase(),
    // Rename GEBOORTEDATUM to DATUM (not all dates are birth dates)
    ...(item.type.toUpperCase() === "GEBOORTEDATUM" ? { type: "DATUM" } : {}),
  }));

  // Also run regex fallback to catch things Ollama might miss
  const regexPii = regexFallbackDetect(rawText);
  for (const rp of regexPii) {
    if (!piiItems.some((p) => p.value === rp.value)) {
      piiItems.push(rp);
    }
  }

  // If Ollama found a full name, also add last name for replacement
  // e.g. "T.B. Van Mierlo" → also replace standalone "Van Mierlo"
  const nameItems = piiItems.filter((p) => p.type === "NAAM");
  for (const nameItem of nameItems) {
    const parts = nameItem.value.split(/\s+/);
    if (parts.length >= 2) {
      // Find the first non-initial part (initials contain dots or are single chars)
      const firstNonInitial = parts.findIndex(
        (p) => !p.includes(".") && p.length > 1
      );
      if (firstNonInitial > 0) {
        const lastName = parts.slice(firstNonInitial).join(" ");
        if (!piiItems.some((p) => p.value === lastName)) {
          piiItems.push({ type: "ACHTERNAAM", value: lastName });
        }
      }
    }
  }

  // If Ollama found an address, also add the street name for partial matches
  // e.g. "Akoleienstraat 10 H, 1016 LN Amsterdam" should also catch "Akoleienstraat 10 1"
  const adresItems = piiItems.filter((p) => p.type === "ADRES");
  for (const adresItem of adresItems) {
    // Extract street name (first word before a number)
    const streetMatch = adresItem.value.match(/^([A-Za-zÀ-ÿ\s]+?\s+\d+)/);
    if (streetMatch) {
      const streetBase = streetMatch[1]; // e.g. "Akoleienstraat 10"
      // Find other occurrences of this street in the text with different suffixes
      const escaped = streetBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const otherMatches = rawText.match(new RegExp(escaped + "[^,\\n]*", "g"));
      if (otherMatches) {
        for (const m of otherMatches) {
          const trimmed = m.trim();
          if (trimmed !== adresItem.value && !piiItems.some((p) => p.value === trimmed)) {
            piiItems.push({ type: "ADRES", value: trimmed });
          }
        }
      }
    }
  }

  // Build token map and replace in text
  const tokenMap: Record<string, string> = {};
  const typeCounters: Record<string, number> = {};
  let anonymizedText = rawText;

  // Sort by value length descending to avoid partial replacements
  const sorted = [...piiItems].sort(
    (a, b) => b.value.length - a.value.length
  );

  for (const item of sorted) {
    if (!item.value || item.value.length < 2) continue;
    const type = item.type.toUpperCase();
    typeCounters[type] = (typeCounters[type] || 0) + 1;
    const token = `[${type}_${typeCounters[type]}]`;
    tokenMap[item.value] = token;
    // Replace all occurrences (case-insensitive for names)
    const escaped = item.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    anonymizedText = anonymizedText.replace(new RegExp(escaped, "gi"), token);
  }

  return {
    anonymizedText,
    piiFound: piiItems,
    piiCount: piiItems.length,
    tokenMap,
  };
}

/**
 * Regex-based PII detection as supplement to Ollama.
 * Catches structured patterns that are easy to match deterministically.
 */
function regexFallbackDetect(text: string): PiiItem[] {
  const items: PiiItem[] = [];
  const seen = new Set<string>();

  const patterns: { type: string; regex: RegExp }[] = [
    // Dutch IBAN
    { type: "IBAN", regex: /\b[A-Z]{2}\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{2,4}\b/g },
    // EAN codes (18 digits, starts with 8716)
    { type: "EAN", regex: /\b8716\d{14}\b/g },
    // Dutch postcodes (4 digits + 2 letters)
    { type: "POSTCODE", regex: /\b\d{4}\s?[A-Z]{2}\b/g },
    // Phone numbers (Dutch)
    { type: "TELEFOONNUMMER", regex: /\b(?:0|\+31[\s-]?)(?:[1-9]\d[\s-]?\d{7}|6[\s-]?\d{8})\b/g },
    // Email (must contain @)
    { type: "EMAIL", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    // Dates (DD-MM-YYYY or DD/MM/YYYY) — tagged as DATUM, not GEBOORTEDATUM
    { type: "DATUM", regex: /\b\d{2}[-/]\d{2}[-/]\d{4}\b/g },
    // Klantnummer: 7-13 digit numbers that appear after "Klantnummer" or "klantnr"
    { type: "KLANTNUMMER", regex: /(?:klantnummer|klantnr|contractnummer|relatienummer)[:\s]*(\d{7,13})/gi },
    // Factuurnummer: numbers after "Factuurnummer" or "factuur"
    { type: "FACTUURNUMMER", regex: /(?:factuurnummer|factuurnr)[:\s]*(\d{7,13})/gi },
  ];

  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Use capture group if present, otherwise full match
      const value = (match[1] || match[0]).trim();
      if (!seen.has(value)) {
        seen.add(value);
        items.push({ type, value });
      }
    }
  }

  return items;
}

/**
 * Extract text from a PDF buffer using pdfjs-dist legacy build.
 * Uses the legacy build to avoid worker issues in Next.js server runtime.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Point worker to the actual file using file:// URL (required on Windows)
  const { pathToFileURL } = await import("url");
  const { resolve } = await import("path");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || "")
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n-- " + " --\n\n");
}
