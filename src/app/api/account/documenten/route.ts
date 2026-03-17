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
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 500 });
  }

  // Get all analyses with their document info
  const { data: analyses } = await supabase
    .from("saved_analyses")
    .select("id, verzekeraar_huidig, product_type, dekking, premie_huidig, created_at, document_url, geanonimiseerde_tekst, pii_count, review_status")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const documenten = (analyses ?? [])
    .filter((a) => a.document_url || a.geanonimiseerde_tekst)
    .map((a) => ({
      id: a.id,
      verzekeraar: a.verzekeraar_huidig,
      product_type: a.product_type,
      dekking: a.dekking,
      premie: a.premie_huidig,
      datum: a.created_at,
      heeft_origineel: !!a.document_url,
      heeft_anon: !!a.geanonimiseerde_tekst,
      pii_count: a.pii_count || 0,
      review_status: a.review_status || "ok",
    }));

  return NextResponse.json({ documenten });
}
