import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  anonymizeWithOllama,
  anonymizeWithRegex,
  extractPdfText,
  isOllamaAvailable,
} from "@/lib/anonymizer-ollama";
import { validatePolisData } from "@/lib/polis-validation";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `Analyseer dit Nederlandse document. Bepaal EERST of het een **verzekeringspolis** of een **energierekening/jaaroverzicht** is.

LET OP: Dit document is GEANONIMISEERD. Persoonsgegevens zijn vervangen door tokens zoals [NAAM_1], [ADRES_1], [POSTCODE_1] etc. Dit is correct en gewenst. Gebruik deze tokens in je output.

Geef ALLEEN een JSON object terug, geen markdown backticks, geen uitleg.

═══ ALS HET EEN VERZEKERINGSPOLIS IS: ═══
{
  "documentType": "verzekering",
  "naam": "[NAAM_1]" of "",
  "adres": "[ADRES_1]" of "",
  "postcode": "[POSTCODE_1]" of "",
  "woonplaats": "[WOONPLAATS_1]" of "",
  "polisnummer": "[POLISNUMMER_1]" of "",
  "verzekeraar": "string" of "",
  "type": "Inboedel" of "Opstal" of "Aansprakelijkheid" of "Reis" of "Onbekend",
  "dekking": "Basis" of "Uitgebreid" of "Extra Uitgebreid" of "All Risk" of "string",
  "voorwaarden": "string" of "",
  "jaarpremie": number of 0,
  "maandpremie": number of 0,
  "premie_periode": "maand" | "jaar" | "kwartaal" | "onbekend" (hoe het bedrag in het document staat),
  "eigenRisico": "string" of "",
  "ingangsdatum": "string" of "",
  "verlengingsdatum": "string" of "",
  "opzegtermijn": "string" of "",
  "gezin": "Alleenstaand" of "Gezin / samenwonend" of "",
  "woning": "Vrijstaand" of "Tussenwoning" of "Hoekwoning" of "Appartement" of "",
  "bouwaard": "string" of "",
  "oppervlakte": "string" of "",
  "huisnummer": "string" of "",
  "geboortedatum": "[GEBOORTEDATUM_1]" of "",
  "eigenaar": "Eigenaar" of "Huurder" of "",
  "dekkingen": [{ "rubriek": "string", "diefstal": "string", "anders": "string" }]
}

Belangrijk bij verzekeringen:
- Als jaarpremie bekend is maar maandpremie niet: maandpremie = jaarpremie / 12
- Als maandpremie bekend is maar jaarpremie niet: jaarpremie = maandpremie * 12
- Detecteer het type verzekering automatisch uit de inhoud
- Als je een veld niet kunt vinden, gebruik "" (lege string) of 0 voor nummers
- Persoonsgegevens staan als tokens ([NAAM_1] etc.) — gebruik deze tokens in je output
- Geef bij premie_periode aan hoe het bedrag LETTERLIJK in het document staat (per maand, per jaar, per kwartaal)
- Als het document "jaarpremie" of "per jaar" zegt: premie_periode = "jaar"
- Als het document "maandpremie" of "per maand" zegt: premie_periode = "maand"
- Als het document "kwartaal" zegt: premie_periode = "kwartaal"
- Als het onduidelijk is: premie_periode = "onbekend"
- Als er een gecombineerde polis is (bv. inboedel + opstal samen), geef het TOTALE bedrag en zet type op het hoofdproduct

═══ ALS HET EEN ENERGIEREKENING/JAAROVERZICHT IS: ═══
{
  "documentType": "energie",
  "leverancier": "naam van de energieleverancier",
  "stroom_normaal_kwh": number (normaal/piektarief verbruik kWh),
  "stroom_dal_kwh": number of null (daltarief verbruik, null als enkeltarief),
  "stroom_kwh_jaar": number (totaal jaarverbruik),
  "gas_m3_jaar": number of null,
  "kosten_maand": number (totale maandkosten),
  "kosten_jaar": number (geschat jaarbedrag),
  "tarief_stroom_normaal": number (tarief per kWh normaal/piek),
  "tarief_stroom_dal": number of null (tarief per kWh dal),
  "tarief_gas_m3": number of null,
  "teruglevering_kwh": number of null (terug geleverd aan net),
  "stroom_vorig_jaar_kwh": number of null (verbruik vorig jaar),
  "ean_stroom": "[EAN_1]" of null,
  "ean_gas": "[EAN_2]" of null,
  "contract_type": "vast" of "variabel" of "dynamisch",
  "adres": "[ADRES_1]" of null,
  "naam": "[NAAM_1]" of null (naam contracthouder),
  "meter_type": "enkel" of "dubbel" (dubbel als er apart dal/piek staat),
  "contract_einddatum": "YYYY-MM-DD" of null
}

Belangrijk bij energie:
- Als er APART dal en normaal/piek verbruik staat → meter_type = "dubbel"
- Als er alleen totaal verbruik staat → meter_type = "enkel", stroom_dal_kwh = null
- Bij dubbeltarief: stroom_kwh_jaar = stroom_normaal_kwh + stroom_dal_kwh
- Als je een veld niet kunt vinden, gebruik null
- Persoonsgegevens staan als tokens ([NAAM_1] etc.) — gebruik deze tokens in je output

═══ ALS HET GEEN VAN BEIDE IS: ═══
{ "documentType": "onbekend" }`;

const PRODUCT_TYPE_MAP: Record<string, string> = {
  "Inboedel": "inboedel",
  "Opstal": "opstal",
  "Aansprakelijkheid": "aansprakelijkheid",
  "Reis": "reis",
};

/**
 * Restore original PII values in parsed data using the token map.
 * Claude returns tokens like [NAAM_1] — we swap them back for the UI.
 */
function restorePii(
  data: Record<string, unknown>,
  tokenMap: Record<string, string>
): Record<string, unknown> {
  const reverseMap: Record<string, string> = {};
  for (const [original, token] of Object.entries(tokenMap)) {
    reverseMap[token] = original;
  }

  const restored: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      let restoredValue = value;
      for (const [token, original] of Object.entries(reverseMap)) {
        restoredValue = restoredValue.replaceAll(token, original);
      }
      restored[key] = restoredValue;
    } else {
      restored[key] = value;
    }
  }
  return restored;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    const isPdf = fileName.endsWith(".pdf") || fileType === "application/pdf";
    const isImage = fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/.test(fileName);

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Upload een PDF of afbeelding (JPG, PNG)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // === STEP 1: Local anonymization with Ollama (REQUIRED for PDFs) ===
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];

    if (isPdf) {
      // PDF: anonymize with Ollama if available, otherwise fall back to regex
      const ollamaReady = await isOllamaAvailable();

      const rawText = await extractPdfText(buffer);
      if (rawText.trim().length < 50) {
        return NextResponse.json(
          { error: "Kon geen tekst uit de PDF extraheren. Probeer een ander bestand of upload een afbeelding." },
          { status: 422 }
        );
      }

      let anonResult;
      let anonMethod: string;
      if (ollamaReady) {
        anonResult = await anonymizeWithOllama(rawText);
        anonMethod = "ollama";
        console.log(`[anonymizer] Ollama found ${anonResult.piiCount} PII items`);
      } else {
        console.warn("[anonymizer] Ollama not available, using regex-only anonymization");
        anonResult = await anonymizeWithRegex(rawText);
        anonMethod = "regex";
        console.log(`[anonymizer] Regex found ${anonResult.piiCount} PII items (limited coverage)`);
      }

      // Send ONLY anonymized text to Claude — never raw PII
      content.push({
        type: "text",
        text: PARSE_PROMPT + "\n\n── DOCUMENT (geanonimiseerd) ──\n" + anonResult.anonymizedText,
      });

      // === STEP 2: Claude parses the anonymized text ===
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let parsed;
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch {
        return NextResponse.json(
          { error: "Kon het document niet uitlezen. Probeer een ander bestand." },
          { status: 422 }
        );
      }

      const documentType = parsed.documentType;
      if (documentType === "onbekend" || !documentType) {
        return NextResponse.json(
          { error: "Dit document is niet herkend. Upload een verzekeringspolis of energierekening." },
          { status: 422 }
        );
      }

      // Build PII summary from anonymization results
      const piiFields: Record<string, string> = {};
      for (const item of anonResult.piiFound) {
        const key = item.type.toLowerCase();
        if (!piiFields[key]) piiFields[key] = item.value;
      }

      if (documentType === "verzekering") {
        const { documentType: _, ...polisData } = parsed;
        if (!polisData.premie_periode) {
          polisData.premie_periode = "onbekend";
        }
        const validatedData = validatePolisData(polisData);
        const productType = PRODUCT_TYPE_MAP[validatedData.type] || "inboedel";
        const restoredData = restorePii(validatedData as unknown as Record<string, unknown>, anonResult.tokenMap);

        return NextResponse.json({
          type: "verzekering",
          polisData: restoredData,
          productType,
          anonymized: {
            text: anonResult.anonymizedText.slice(0, 2000),
            piiCount: anonResult.piiCount,
            personalData: piiFields,
            method: anonMethod,
          },
        });
      }

      if (documentType === "energie") {
        const { documentType: _, ...energieData } = parsed;
        const restoredData = restorePii(energieData, anonResult.tokenMap);

        return NextResponse.json({
          type: "energie",
          energieData: restoredData,
          anonymized: {
            text: anonResult.anonymizedText.slice(0, 2000),
            piiCount: anonResult.piiCount,
            personalData: piiFields,
            method: anonMethod,
          },
        });
      }

      return NextResponse.json(
        { error: "Onverwacht documenttype. Probeer opnieuw." },
        { status: 422 }
      );
    }

    // === IMAGE FLOW ===
    // Images can't be text-extracted for local anonymization yet.
    // Block image uploads until OCR anonymization is implemented.
    if (process.env.ALLOW_IMAGE_UPLOADS !== "true") {
      return NextResponse.json(
        { error: "Upload je document als PDF voor veilige verwerking. Afbeeldingen worden momenteel niet ondersteund." },
        { status: 400 }
      );
    }
    console.warn("[anonymizer] Image upload — no local anonymization, sending raw to Claude");
    const base64 = buffer.toString("base64");
    const mimeType = fileType || "image/jpeg";
    content.push({
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64 },
    });
    content.push({ type: "text", text: PARSE_PROMPT });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json(
        { error: "Kon het document niet uitlezen. Probeer een ander bestand." },
        { status: 422 }
      );
    }

    const documentType = parsed.documentType;
    if (documentType === "onbekend" || !documentType) {
      return NextResponse.json(
        { error: "Dit document is niet herkend. Upload een verzekeringspolis of energierekening." },
        { status: 422 }
      );
    }

    // Image flow: no Ollama anonymization, warn in response
    if (documentType === "verzekering") {
      const { documentType: _, ...polisData } = parsed;
      if (!polisData.premie_periode) {
        polisData.premie_periode = "onbekend";
      }
      const validatedData = validatePolisData(polisData);
      const productType = PRODUCT_TYPE_MAP[validatedData.type] || "inboedel";
      return NextResponse.json({
        type: "verzekering",
        polisData: validatedData,
        productType,
        anonymized: { text: "", piiCount: 0, personalData: {}, method: "none-image" },
      });
    }

    if (documentType === "energie") {
      const { documentType: _, ...energieData } = parsed;
      return NextResponse.json({
        type: "energie",
        energieData,
        anonymized: { text: "", piiCount: 0, personalData: {}, method: "none-image" },
      });
    }

    return NextResponse.json(
      { error: "Onverwacht documenttype. Probeer opnieuw." },
      { status: 422 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Parse error:", msg, err);
    return NextResponse.json(
      { error: "Fout bij het verwerken. Probeer het opnieuw.", detail: msg },
      { status: 500 }
    );
  }
}
