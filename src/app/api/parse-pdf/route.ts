import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `Analyseer dit Nederlandse document. Bepaal EERST of het een **verzekeringspolis** of een **energierekening/jaaroverzicht** is.

Geef ALLEEN een JSON object terug, geen markdown backticks, geen uitleg.

═══ ALS HET EEN VERZEKERINGSPOLIS IS: ═══
{
  "documentType": "verzekering",
  "naam": "string" of "",
  "adres": "string" of "",
  "postcode": "string" of "",
  "woonplaats": "string" of "",
  "polisnummer": "string" of "",
  "verzekeraar": "string" of "",
  "type": "Inboedel" of "Opstal" of "Aansprakelijkheid" of "Reis" of "Onbekend",
  "dekking": "Basis" of "Uitgebreid" of "Extra Uitgebreid" of "All Risk" of "string",
  "voorwaarden": "string" of "",
  "jaarpremie": number of 0,
  "maandpremie": number of 0,
  "eigenRisico": "string" of "",
  "ingangsdatum": "string" of "",
  "verlengingsdatum": "string" of "",
  "opzegtermijn": "string" of "",
  "gezin": "Alleenstaand" of "Gezin / samenwonend" of "",
  "woning": "Vrijstaand" of "Tussenwoning" of "Hoekwoning" of "Appartement" of "",
  "bouwaard": "string" of "",
  "oppervlakte": "string" of "",
  "huisnummer": "string" of "",
  "geboortedatum": "string" of "",
  "eigenaar": "Eigenaar" of "Huurder" of "",
  "dekkingen": [{ "rubriek": "string", "diefstal": "string", "anders": "string" }]
}

Belangrijk bij verzekeringen:
- Als jaarpremie bekend is maar maandpremie niet: maandpremie = jaarpremie / 12
- Als maandpremie bekend is maar jaarpremie niet: jaarpremie = maandpremie * 12
- Detecteer het type verzekering automatisch uit de inhoud
- Als je een veld niet kunt vinden, gebruik "" (lege string) of 0 voor nummers

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
  "ean_stroom": "string" of null,
  "ean_gas": "string" of null,
  "contract_type": "vast" of "variabel" of "dynamisch",
  "adres": "string" of null,
  "naam": "string" of null (naam contracthouder),
  "meter_type": "enkel" of "dubbel" (dubbel als er apart dal/piek staat),
  "contract_einddatum": "YYYY-MM-DD" of null
}

Belangrijk bij energie:
- Als er APART dal en normaal/piek verbruik staat → meter_type = "dubbel"
- Als er alleen totaal verbruik staat → meter_type = "enkel", stroom_dal_kwh = null
- Bij dubbeltarief: stroom_kwh_jaar = stroom_normaal_kwh + stroom_dal_kwh
- Als je een veld niet kunt vinden, gebruik null

═══ ALS HET GEEN VAN BEIDE IS: ═══
{ "documentType": "onbekend" }`;

const PRODUCT_TYPE_MAP: Record<string, string> = {
  "Inboedel": "inboedel",
  "Opstal": "opstal",
  "Aansprakelijkheid": "aansprakelijkheid",
  "Reis": "reis",
};

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
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Build Claude Vision content based on file type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];

    if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      const mimeType = fileType || "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: mimeType, data: base64 },
      });
    }

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

    // Handle document type
    const documentType = parsed.documentType;

    if (documentType === "onbekend" || !documentType) {
      return NextResponse.json(
        { error: "Dit document is niet herkend. Upload een verzekeringspolis of energierekening." },
        { status: 422 }
      );
    }

    if (documentType === "verzekering") {
      // Remove documentType from polisData
      const { documentType: _, ...polisData } = parsed;
      const productType = PRODUCT_TYPE_MAP[polisData.type] || "inboedel";
      return NextResponse.json({ type: "verzekering", polisData, productType });
    }

    if (documentType === "energie") {
      const { documentType: _, ...energieData } = parsed;
      return NextResponse.json({ type: "energie", energieData });
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
