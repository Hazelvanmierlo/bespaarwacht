import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 500 });
  }

  const { data: analysis } = await supabase
    .from("saved_analyses")
    .select("id, verzekeraar_huidig, product_type, geanonimiseerde_tekst, user_id")
    .eq("id", id)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
  }

  if (analysis.user_id !== session.user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  if (!analysis.geanonimiseerde_tekst) {
    return NextResponse.json({ error: "Geen geanonimiseerde versie beschikbaar" }, { status: 404 });
  }

  // Return as downloadable text file
  const filename = `anon_${analysis.verzekeraar_huidig}_${analysis.product_type}.txt`
    .replace(/\s+/g, "_")
    .toLowerCase();

  return new NextResponse(analysis.geanonimiseerde_tekst, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
