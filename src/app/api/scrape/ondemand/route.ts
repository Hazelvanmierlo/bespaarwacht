import { NextRequest, NextResponse } from "next/server";
import { getScrapers, type ScraperInput, type ScraperResult, type ProductType } from "@/lib/scrapers";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getVerzekeraarMeta } from "@/lib/verzekeraar-meta";
import type { Alternative } from "@/lib/types";

const VALID_PRODUCT_TYPES: ProductType[] = ["inboedel", "opstal", "aansprakelijkheid", "reis"];

/**
 * POST /api/scrape/ondemand
 *
 * Public endpoint that runs scrapers for a given product type in parallel.
 * Returns Alternative[] with merged verzekeraar metadata.
 * Does NOT write to Supabase.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON body" }, { status: 400 });
  }

  // Determine product type (default: inboedel for backward compat)
  const productType = (body.productType as ProductType) ?? "inboedel";
  if (!VALID_PRODUCT_TYPES.includes(productType)) {
    return NextResponse.json(
      { error: `Ongeldig productType. Kies uit: ${VALID_PRODUCT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Per-product input validation
  const validationError = validateInput(body, productType);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const input = body as unknown as ScraperInput;

  // Get scrapers for this product type
  const productScrapers = getScrapers(productType);
  if (productScrapers.length === 0) {
    return NextResponse.json({ error: `Geen scrapers beschikbaar voor ${productType}` }, { status: 400 });
  }

  // Try to load verzekeraar metadata from Supabase
  let dbMeta: Record<string, { naam: string; beoordeling: number; url: string; kleur: string }> = {};
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("verzekeraars")
        .select("slug, naam, beoordeling, url, kleur");
      if (data) {
        for (const row of data) {
          dbMeta[row.slug] = row;
        }
      }
    } catch {
      // Fall through to hardcoded metadata
    }
  }

  // Higher timeout when live scrapers are enabled (Playwright needs more time)
  const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";
  const TIMEOUT_MS = LIVE_SCRAPERS_ENABLED ? 60000 : 8000;

  const results = await Promise.all(
    productScrapers.map(async (scraper): Promise<ScraperResult> => {
      try {
        return await Promise.race([
          scraper.run(input),
          new Promise<ScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout na ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
          ),
        ]);
      } catch {
        return {
          slug: scraper.slug,
          status: "timeout",
          duration_ms: TIMEOUT_MS,
          error: `Timeout na ${TIMEOUT_MS / 1000}s`,
        };
      }
    })
  );

  // Convert successful results to Alternative[] with metadata
  const alternatives: Alternative[] = results
    .filter((r) => r.status === "success" && r.premie && r.premie > 0)
    .map((r) => {
      const meta = getVerzekeraarMeta(r.slug, productType);
      const db = dbMeta[r.slug];

      return {
        id: r.slug,
        naam: db?.naam ?? meta?.naam ?? r.slug,
        premie: r.premie!,
        dekking: r.dekking ?? "Onbekend",
        eigenRisico: r.eigenRisico ?? "€ 0",
        beoordeling: db?.beoordeling ?? meta?.beoordeling ?? 3,
        beoordelingBron: meta?.beoordelingBron ?? "",
        highlight: meta?.highlight ?? "",
        url: db?.url ?? meta?.url ?? "",
        kleur: db?.kleur ?? meta?.kleur ?? "#666666",
      };
    })
    .sort((a, b) => a.premie - b.premie);

  // Determine source: "live" if any scraper returned live data
  const hasLiveResults = results.some((r) => r.status === "success" && r.source === "live");
  const overallSource = hasLiveResults ? "live" : "calculated";

  return NextResponse.json({
    source: overallSource,
    productType,
    count: alternatives.length,
    data: alternatives,
    errors: results
      .filter((r) => r.status !== "success")
      .map((r) => ({ slug: r.slug, status: r.status, error: r.error })),
  });
}

function validateInput(body: Record<string, unknown>, productType: ProductType): string | null {
  switch (productType) {
    case "inboedel":
      if (!body.postcode || !body.woningtype || !body.oppervlakte || !body.gezin || !body.dekking) {
        return "Vereiste velden voor inboedel: postcode, woningtype, oppervlakte, gezin, dekking";
      }
      return null;

    case "opstal":
      if (!body.postcode || !body.woningtype || !body.oppervlakte || !body.bouwjaar || !body.dekking) {
        return "Vereiste velden voor opstal: postcode, woningtype, oppervlakte, bouwjaar, dekking";
      }
      return null;

    case "aansprakelijkheid":
      if (!body.postcode || !body.gezin) {
        return "Vereiste velden voor aansprakelijkheid: postcode, gezin";
      }
      return null;

    case "reis":
      if (!body.gezin || body.doorlopend === undefined || !body.werelddeel) {
        return "Vereiste velden voor reis: gezin, doorlopend, werelddeel";
      }
      return null;

    default:
      return "Ongeldig productType";
  }
}
