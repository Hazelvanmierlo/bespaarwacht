import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-server";

/** Fetch all active verzekeraars with their latest premies (public) */
export async function getAlternatives(productType = "inboedel") {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("premies")
    .select(
      `
      id,
      premie_maand,
      premie_jaar,
      dekking,
      eigen_risico,
      beoordeling,
      beoordeling_bron,
      highlight,
      scraped_at,
      verzekeraars!inner (
        id,
        slug,
        naam,
        website,
        kleur,
        calculator_url,
        actief
      )
    `
    )
    .eq("product_type", productType)
    .eq("is_valid", true)
    .order("scraped_at", { ascending: false });

  if (!data) return [];

  // Group by verzekeraar, take latest premie per verzekeraar
  const latest = new Map<string, (typeof data)[0]>();
  for (const row of data) {
    const v = row.verzekeraars as unknown as { slug: string; actief: boolean };
    if (!v.actief) continue;
    if (!latest.has(v.slug)) {
      latest.set(v.slug, row);
    }
  }

  return Array.from(latest.values()).map((row) => {
    const v = row.verzekeraars as unknown as {
      slug: string;
      naam: string;
      kleur: string;
      calculator_url: string;
    };
    return {
      id: v.slug,
      naam: v.naam,
      premie: Number(row.premie_maand),
      dekking: row.dekking ?? "",
      eigenRisico: row.eigen_risico ?? "€ 0",
      beoordeling: row.beoordeling ?? 3,
      beoordelingBron: row.beoordeling_bron ?? "",
      highlight: row.highlight ?? "",
      url: v.calculator_url ?? "",
      kleur: v.kleur ?? "#64748B",
    };
  });
}

/** Save an analysis for a logged-in user (server-side) */
export async function saveAnalysis(
  userId: string,
  data: {
    verzekeraar: string;
    productType: string;
    dekking: string;
    premieHuidig: number;
    besteAlternatief: string;
    maxBesparing: number;
    einddatum?: string | null;
    polisnummer?: string | null;
    verzekeraarTelefoon?: string | null;
    verzekeraarWebsite?: string | null;
  }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: { message: "DB niet geconfigureerd" } };

  return supabase.from("saved_analyses").insert({
    user_id: userId,
    verzekeraar_huidig: data.verzekeraar,
    product_type: data.productType,
    dekking: data.dekking,
    premie_huidig: data.premieHuidig,
    beste_alternatief: data.besteAlternatief,
    max_besparing: data.maxBesparing,
    monitoring_active: true,
    einddatum: data.einddatum ?? null,
    polisnummer: data.polisnummer ?? null,
    verzekeraar_telefoon: data.verzekeraarTelefoon ?? null,
    verzekeraar_website: data.verzekeraarWebsite ?? null,
  });
}

/** Update an analysis (server-side) — for inline edits in dashboard */
export async function updateAnalysis(
  userId: string,
  analysisId: string,
  data: {
    einddatum?: string | null;
    polisnummer?: string | null;
    monitoring_active?: boolean;
  }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: { message: "DB niet geconfigureerd" } };

  return supabase
    .from("saved_analyses")
    .update(data)
    .eq("id", analysisId)
    .eq("user_id", userId);
}

/** Get saved analyses for a user (server-side) */
export async function getUserAnalyses(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("saved_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Delete an analysis (server-side) */
export async function deleteAnalysis(userId: string, analysisId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: { message: "DB niet geconfigureerd" } };

  return supabase
    .from("saved_analyses")
    .delete()
    .eq("id", analysisId)
    .eq("user_id", userId);
}
