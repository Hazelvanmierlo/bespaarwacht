import { NextResponse } from "next/server";
import { getAlternatives } from "@/lib/queries";
import { ALTERNATIVES } from "@/lib/market-data";

export async function GET() {
  const dbAlternatives = await getAlternatives("inboedel");

  if (dbAlternatives.length > 0) {
    return NextResponse.json({ source: "supabase", data: dbAlternatives });
  }

  // Fallback to hardcoded data
  return NextResponse.json({ source: "hardcoded", data: ALTERNATIVES });
}
