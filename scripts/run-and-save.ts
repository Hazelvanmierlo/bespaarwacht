/**
 * Run InShared Playwright scraper and save results to Supabase.
 *
 * Usage:  npx tsx scripts/run-and-save.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import { scrapeInShared } from "../src/lib/scrapers/playwright/inshared-live";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten in .env.local staan.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🔄 InShared Playwright scraper starten...\n");

  // Look up verzekeraar_id for inshared
  const { data: verzekeraar, error: vzErr } = await supabase
    .from("verzekeraars")
    .select("id")
    .eq("slug", "inshared")
    .single();

  if (!verzekeraar || vzErr) {
    console.error("❌ Verzekeraar 'inshared' niet gevonden in database:", vzErr?.message);
    process.exit(1);
  }

  const result = await scrapeInShared({
    postcode: "1181EC",
    huisnummer: "10",
    gezin: "gezin",
    eigenaar: true,
    geboortedatum: "15-06-1985",
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duur: ${result.duration_ms}ms`);

  // Log scraper run
  await supabase.from("scraper_runs").insert({
    verzekeraar_id: verzekeraar.id,
    status: result.status,
    premie_gevonden: result.premie ?? null,
    duration_ms: result.duration_ms,
    error_message: result.error ?? null,
  });

  if (result.status === "success" && result.premie) {
    console.log(`✅ Premie: € ${result.premie.toFixed(2)}/mnd`);
    console.log(`✅ Dekking: ${result.dekking}`);
    console.log(`✅ Eigen risico: ${result.eigenRisico}`);

    // Save premium to database
    const { error: insertErr } = await supabase.from("premies").insert({
      verzekeraar_id: verzekeraar.id,
      product_type: "inboedel",
      premie_maand: result.premie,
      premie_jaar: +(result.premie * 12).toFixed(2),
      dekking: result.dekking ?? "Inboedel Standaard",
      eigen_risico: result.eigenRisico ?? "€ 0",
      input_params: {
        postcode: "1181EC",
        huisnummer: "10",
        gezin: "gezin",
        eigenaar: true,
        source: "playwright",
      },
    });

    if (insertErr) {
      console.error("❌ Opslaan in premies mislukt:", insertErr.message);
    } else {
      console.log("\n✅ Premie opgeslagen in Supabase!");
    }
  } else {
    console.error(`❌ Scrape mislukt: ${result.error}`);
  }
}

main().catch(console.error);
