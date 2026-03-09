import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { extractPolisFromText, detectProductType, detectProductTypeFromText } from "@/lib/pdf-parser";
import path from "path";
import { pathToFileURL } from "url";

// Point pdfjs-dist to the worker bundled with pdf-parse
const workerPath = path.join(process.cwd(), "node_modules/pdf-parse/dist/worker/pdf.worker.mjs");
PDFParse.setWorker(pathToFileURL(workerPath).href);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Geen PDF bestand ontvangen" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Alleen PDF bestanden worden geaccepteerd" }, { status: 400 });
    }

    // Read file as ArrayBuffer for pdf-parse v2
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const parser = new PDFParse({ data });
    const textResult = await parser.getText();
    const text = textResult.text;
    await parser.destroy();

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Kon geen tekst uit de PDF halen. Probeer een ander bestand." },
        { status: 422 }
      );
    }

    // Extract structured polis data from text
    const polisData = extractPolisFromText(text);

    if (!polisData) {
      return NextResponse.json(
        { error: "Kon geen polisgegevens herkennen in de PDF. Is dit een Nederlands polisblad?" },
        { status: 422 }
      );
    }

    // Detect product type — prefer structured detection, fall back to text-based
    const productType = polisData.type !== "Onbekend"
      ? detectProductType(polisData)
      : detectProductTypeFromText(text);

    return NextResponse.json({
      polisData,
      productType,
      textLength: text.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PDF parse error:", msg, err);
    return NextResponse.json(
      { error: "Fout bij het verwerken van de PDF. Probeer het opnieuw.", detail: msg },
      { status: 500 }
    );
  }
}
