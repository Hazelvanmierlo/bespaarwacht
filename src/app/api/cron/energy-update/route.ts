import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import leveranciersJson from "@/data/leveranciers.json";

interface ContractData {
  type: string;
  normaal: number;
  dal: number;
  gas: number;
  vastrecht_stroom: number;
  vastrecht_gas: number;
}

interface LeverancierData {
  modelcontract_url: string;
  laatst_gescand: string;
  rating: number;
  contracten: ContractData[];
  affiliate: unknown;
}

/**
 * GET /api/cron/energy-update
 *
 * Daily cron (03:00 UTC) — fetches energy provider websites,
 * extracts tariffs with Claude, and stores in Supabase.
 * Falls back to leveranciers.json if scraping fails.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet geconfigureerd" }, { status: 503 });
  }

  const leveranciers = leveranciersJson.leveranciers as Record<string, LeverancierData>;
  const names = Object.keys(leveranciers);
  const results: { leverancier: string; status: string; contracts?: number; error?: string }[] = [];

  // Process max 6 leveranciers per run to stay within Vercel timeout
  // Rotate which batch runs based on day of month
  const batchSize = 6;
  const dayOfMonth = new Date().getDate();
  const batchIndex = dayOfMonth % Math.ceil(names.length / batchSize);
  const batch = names.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

  for (const naam of batch) {
    const lev = leveranciers[naam];

    try {
      // Try to fetch the modelcontract page
      let extractedContracts: ContractData[] | null = null;

      try {
        const response = await fetch(lev.modelcontract_url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; DeVerzekeringsAgent/1.0)" },
          signal: AbortSignal.timeout(8000),
        });

        const contentType = response.headers.get("content-type") || "";

        // Only process HTML pages, skip PDFs
        if (response.ok && contentType.includes("text/html")) {
          const html = await response.text();

          // Only use Claude if we have an API key and the page has meaningful content
          if (process.env.ANTHROPIC_API_KEY && html.length > 500) {
            // Truncate HTML to save tokens (first 8000 chars is usually enough)
            const truncated = html.slice(0, 8000);

            const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 500,
                messages: [
                  {
                    role: "user",
                    content: `Extract energy tariffs from this Dutch energy provider webpage (${naam}). Return ONLY valid JSON array, no other text.

Each element: {"type":"Variabel|1jaar|3jaar|Dynamisch","normaal":0.25,"dal":0.22,"gas":0.91,"vastrecht_stroom":5.50,"vastrecht_gas":5.50}

Rates are in €/kWh for electricity, €/m³ for gas, €/month for vastrecht. If you can't find tariffs, return [].

HTML:
${truncated}`,
                  },
                ],
              }),
            });

            if (claudeResponse.ok) {
              const claudeData = await claudeResponse.json();
              const text = claudeData?.content?.[0]?.text || "";
              // Extract JSON array from response
              const match = text.match(/\[[\s\S]*\]/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].normaal) {
                  extractedContracts = parsed;
                }
              }
            }
          }
        }
      } catch {
        // Scraping failed, will fall back to JSON
      }

      // Use extracted data or fall back to leveranciers.json
      const contracts = extractedContracts || lev.contracten;
      const bron = extractedContracts ? "scrape" : "json-fallback";

      // Upsert into Supabase
      let insertCount = 0;
      for (const contract of contracts) {
        const { error } = await supabase.from("energie_tarieven").upsert(
          {
            leverancier: naam,
            contract_type: contract.type,
            tarief_stroom_normaal: contract.normaal,
            tarief_stroom_dal: contract.dal,
            tarief_gas: contract.gas,
            vastrecht_stroom: contract.vastrecht_stroom,
            vastrecht_gas: contract.vastrecht_gas,
            bron,
            geldig_vanaf: new Date().toISOString().split("T")[0],
          },
          { onConflict: "leverancier,contract_type,geldig_vanaf" }
        );
        if (!error) insertCount++;
      }

      results.push({ leverancier: naam, status: bron, contracts: insertCount });
    } catch (err) {
      results.push({ leverancier: naam, status: "error", error: String(err) });
    }

    // Be nice to websites: 2s delay between requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  const scraped = results.filter((r) => r.status === "scrape").length;
  const fallback = results.filter((r) => r.status === "json-fallback").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    message: `Energie-update batch ${batchIndex + 1}: ${scraped} gescraped, ${fallback} fallback, ${errors} fouten`,
    batch: `${batchIndex + 1}/${Math.ceil(names.length / batchSize)}`,
    results,
  });
}
