import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const body = await req.json();

  const {
    leverancier_huidig,
    premie_huidig,
    beste_alternatief,
    max_besparing,
    kwh_verbruik,
    gas_verbruik,
  } = body;

  if (!leverancier_huidig) {
    return NextResponse.json(
      { error: "Huidige leverancier is verplicht" },
      { status: 400 }
    );
  }

  // Build a usage summary for the 'dekking' field
  const dekkingParts: string[] = [];
  if (kwh_verbruik) dekkingParts.push(`${kwh_verbruik} kWh elektra`);
  if (gas_verbruik) dekkingParts.push(`${gas_verbruik} m³ gas`);
  const dekking = dekkingParts.join(", ") || "Energieverbruik";

  const { data, error } = await supabase
    .from("saved_analyses")
    .insert({
      user_id: session.user.id,
      verzekeraar_huidig: leverancier_huidig,
      product_type: "energie",
      premie_huidig: premie_huidig ?? null,
      beste_alternatief: beste_alternatief ?? null,
      max_besparing: max_besparing ?? null,
      dekking,
      monitoring_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
