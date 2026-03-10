import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  // Get user email to match leads
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", session.user.id)
    .single();

  if (!user?.email) {
    return NextResponse.json({ leads: [] });
  }

  const { data: leads, error } = await supabase
    .from("energie_leads")
    .select("id, leverancier_huidig, leverancier_nieuw, besparing_jaar1, status, created_at")
    .eq("email", user.email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ leads: leads ?? [] });
}
