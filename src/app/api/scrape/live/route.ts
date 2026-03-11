import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { scrapeInShared } from "@/lib/scrapers/playwright/inshared-live";

/**
 * POST /api/scrape/live
 *
 * Runs the Playwright-based InShared scraper and saves results to Supabase.
 * Only works locally — Playwright requires a browser which cannot run on Vercel serverless.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet geconfigureerd" }, { status: 503 });
  }

  // Look up verzekeraar
  const { data: verzekeraar } = await supabase
    .from("verzekeraars")
    .select("id")
    .eq("slug", "inshared")
    .single();

  if (!verzekeraar) {
    return NextResponse.json({ error: "Verzekeraar 'inshared' niet gevonden" }, { status: 404 });
  }

  const result = await scrapeInShared({
    postcode: "1181EC",
    huisnummer: "10",
    gezin: "gezin",
    eigenaar: true,
  });

  // Log scraper run
  await supabase.from("scraper_runs").insert({
    verzekeraar_id: verzekeraar.id,
    status: result.status,
    premie_gevonden: result.premie ?? null,
    duration_ms: result.duration_ms,
    error_message: result.error ?? null,
    step_log: result.stepLog ?? null,
  });

  if (result.status === "success" && result.premie) {
    await supabase.from("premies").insert({
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
  }

  return NextResponse.json({
    status: result.status,
    premie: result.premie,
    dekking: result.dekking,
    eigenRisico: result.eigenRisico,
    duration_ms: result.duration_ms,
    error: result.error,
    saved: result.status === "success",
  });
}
