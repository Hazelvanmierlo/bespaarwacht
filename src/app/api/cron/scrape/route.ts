import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { scrapers, type ScraperInput } from "@/lib/scrapers";

const DEFAULT_INPUT: ScraperInput = {
  postcode: "1186",
  woningtype: "vrijstaand",
  oppervlakte: 264,
  gezin: "gezin",
  dekking: "extra_uitgebreid",
};

/**
 * GET /api/cron/scrape
 *
 * Vercel Cron job — runs all 12 API-based scrapers daily and saves to Supabase.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Note: Playwright scraper is NOT included here (requires browser, run locally).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet geconfigureerd" }, { status: 503 });
  }

  const results = await Promise.all(
    scrapers.map(async (scraper) => {
      const result = await scraper.run(DEFAULT_INPUT);

      const { data: verzekeraar } = await supabase
        .from("verzekeraars")
        .select("id")
        .eq("slug", result.slug)
        .single();

      if (verzekeraar) {
        // Log scraper run
        await supabase.from("scraper_runs").insert({
          verzekeraar_id: verzekeraar.id,
          status: result.status,
          premie_gevonden: result.premie ?? null,
          duration_ms: result.duration_ms,
          error_message: result.error ?? null,
        });

        // Save premium if successful
        if (result.status === "success" && result.premie) {
          await supabase.from("premies").insert({
            verzekeraar_id: verzekeraar.id,
            product_type: "inboedel",
            premie_maand: result.premie,
            premie_jaar: +(result.premie * 12).toFixed(2),
            dekking: result.dekking,
            eigen_risico: result.eigenRisico,
            input_params: { ...DEFAULT_INPUT, source: "cron" },
          });
        }
      }

      return {
        slug: result.slug,
        status: result.status,
        premie: result.premie,
        duration_ms: result.duration_ms,
        error: result.error,
      };
    })
  );

  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status !== "success").length;

  return NextResponse.json({
    message: `Cron voltooid: ${success} succesvol, ${failed} mislukt`,
    results,
  });
}
