import { NextResponse } from "next/server";
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
 * GET /api/energie/tarieven
 *
 * Returns the latest energy tariffs per leverancier.
 * Reads from Supabase if available, falls back to leveranciers.json.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();

  // Try to get from database first
  if (supabase) {
    const { data } = await supabase
      .from("energie_tarieven")
      .select("*")
      .order("geldig_vanaf", { ascending: false })
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Group by leverancier + contract_type, take latest
      const latest = new Map<string, typeof data[0]>();
      for (const row of data) {
        const key = `${row.leverancier}|${row.contract_type}`;
        if (!latest.has(key)) {
          latest.set(key, row);
        }
      }

      // Group by leverancier
      const byLeverancier: Record<string, {
        contracten: {
          type: string;
          normaal: number;
          dal: number;
          gas: number;
          vastrecht_stroom: number;
          vastrecht_gas: number;
          bron: string;
          geldig_vanaf: string;
        }[];
        rating: number;
      }> = {};

      const leveranciers = leveranciersJson.leveranciers as Record<string, LeverancierData>;

      for (const row of latest.values()) {
        if (!byLeverancier[row.leverancier]) {
          byLeverancier[row.leverancier] = {
            contracten: [],
            rating: leveranciers[row.leverancier]?.rating ?? 7.0,
          };
        }
        byLeverancier[row.leverancier].contracten.push({
          type: row.contract_type,
          normaal: Number(row.tarief_stroom_normaal),
          dal: Number(row.tarief_stroom_dal),
          gas: Number(row.tarief_gas),
          vastrecht_stroom: Number(row.vastrecht_stroom),
          vastrecht_gas: Number(row.vastrecht_gas),
          bron: row.bron,
          geldig_vanaf: row.geldig_vanaf,
        });
      }

      return NextResponse.json({
        bron: "database",
        laatst_bijgewerkt: data[0].geldig_vanaf,
        leveranciers: byLeverancier,
      });
    }
  }

  // Fallback to static JSON
  return NextResponse.json({
    bron: "json-fallback",
    laatst_bijgewerkt: leveranciersJson.laatst_bijgewerkt,
    leveranciers: leveranciersJson.leveranciers,
  });
}
