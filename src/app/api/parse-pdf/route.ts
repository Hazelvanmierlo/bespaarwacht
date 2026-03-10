import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `Lees dit Nederlandse verzekeringspolis/polisblad uit.
Geef ALLEEN een JSON object terug, geen markdown backticks, geen uitleg:
{
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

Belangrijk:
- Als jaarpremie bekend is maar maandpremie niet: maandpremie = jaarpremie / 12
- Als maandpremie bekend is maar jaarpremie niet: jaarpremie = maandpremie * 12
- Detecteer het type verzekering automatisch uit de inhoud
- Als het GEEN verzekeringspolis is: { "error": "geen_polis" }
- Als je een veld niet kunt vinden, gebruik "" (lege string) of 0 voor nummers`;

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
    let polisData;
    try {
      polisData = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json(
        { error: "Kon het document niet uitlezen. Probeer een ander bestand." },
        { status: 422 }
      );
    }

    if (polisData.error) {
      return NextResponse.json(
        { error: "Dit lijkt geen verzekeringspolis. Upload je polisblad of factuur." },
        { status: 422 }
      );
    }

    // Detect product type
    const productType = PRODUCT_TYPE_MAP[polisData.type] || "inboedel";

    return NextResponse.json({ polisData, productType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Parse error:", msg, err);
    return NextResponse.json(
      { error: "Fout bij het verwerken. Probeer het opnieuw.", detail: msg },
      { status: 500 }
    );
  }
}
