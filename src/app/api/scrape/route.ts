import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { scrapers, getScraper, type ScraperInput } from "@/lib/scrapers";

const DEFAULT_INPUT: ScraperInput = {
  postcode: "1186",
  woningtype: "vrijstaand",
  oppervlakte: 264,
  gezin: "gezin",
  dekking: "extra_uitgebreid",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet geconfigureerd" }, { status: 503 });
  }

  const slug = req.nextUrl.searchParams.get("slug");
  const body = await req.json().catch(() => ({}));
  const input: ScraperInput = { ...DEFAULT_INPUT, ...body };

  const toRun = slug ? [getScraper(slug)].filter(Boolean) : scrapers;

  if (toRun.length === 0) {
    return NextResponse.json({ error: `Scraper '${slug}' niet gevonden` }, { status: 404 });
  }

  const results = await Promise.all(
    toRun.map(async (scraper) => {
      const result = await scraper!.run(input);

      const { data: verzekeraar } = await supabase
        .from("verzekeraars")
        .select("id")
        .eq("slug", result.slug)
        .single();

      if (verzekeraar) {
        await supabase.from("scraper_runs").insert({
          verzekeraar_id: verzekeraar.id,
          status: result.status,
          premie_gevonden: result.premie ?? null,
          duration_ms: result.duration_ms,
          error_message: result.error ?? null,
        });

        if (result.status === "success" && result.premie) {
          await supabase.from("premies").insert({
            verzekeraar_id: verzekeraar.id,
            product_type: "inboedel",
            premie_maand: result.premie,
            premie_jaar: +(result.premie * 12).toFixed(2),
            dekking: result.dekking,
            eigen_risico: result.eigenRisico,
            input_params: input,
          });
        }
      }

      return result;
    })
  );

  return NextResponse.json({ results });
}
