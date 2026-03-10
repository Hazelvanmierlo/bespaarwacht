import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import leveranciersJson from "@/data/leveranciers.json";
import { scrapeLeverancier, logScrapeResult } from "@/lib/energie/scraper";

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
 * Daily cron (03:00 UTC) — scrapes energy provider websites,
 * extracts tariffs with Claude, stores in Supabase, and logs results.
 * Processes 6 leveranciers per run (rotates by day) to stay within
 * Vercel's 60s hobby timeout.
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

  // Process max 6 leveranciers per run, rotate by day
  const batchSize = 6;
  const dayOfMonth = new Date().getDate();
  const totalBatches = Math.ceil(names.length / batchSize);
  const batchIndex = dayOfMonth % totalBatches;
  const batch = names.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

  for (const naam of batch) {
    const lev = leveranciers[naam];

    // Scrape with fallback
    const scrapeResult = await scrapeLeverancier(
      naam,
      lev.modelcontract_url,
      lev.contracten,
    );

    // Log to scraper_logs table
    await logScrapeResult(supabase, naam, scrapeResult);

    // Upsert tariffs into energie_tarieven
    const contracts = scrapeResult.tarieven;
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
          bron: scrapeResult.methode,
          geldig_vanaf: new Date().toISOString().split("T")[0],
        },
        { onConflict: "leverancier,contract_type,geldig_vanaf" }
      );
      if (!error) insertCount++;
    }

    results.push({
      leverancier: naam,
      status: scrapeResult.success ? "scrape" : "json-fallback",
      contracts: insertCount,
      error: scrapeResult.error,
    });

    // Be nice to websites: 1.5s delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }

  const scraped = results.filter((r) => r.status === "scrape").length;
  const fallback = results.filter((r) => r.status === "json-fallback").length;
  const errors = results.filter((r) => r.error).length;

  return NextResponse.json({
    message: `Energie-update batch ${batchIndex + 1}/${totalBatches}: ${scraped} scraped, ${fallback} fallback, ${errors} errors`,
    batch: `${batchIndex + 1}/${totalBatches}`,
    results,
  });
}
