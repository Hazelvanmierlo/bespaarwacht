import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveAnalysis, getUserAnalyses } from "@/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const analyses = await getUserAnalyses(session.user.id);
  return NextResponse.json({ analyses });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const body = await req.json();
  const { error } = await saveAnalysis(session.user.id, body);

  if (error) {
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  // Auto-fill profile from extracted personal data (if provided)
  if (body.personalData) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // Get current profile to only fill empty fields
      const { data: currentUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (currentUser) {
        const fieldMap: Record<string, string> = {
          naam: "name",
          adres: "adres",
          postcode: "postcode",
          woonplaats: "woonplaats",
          huisnummer: "huisnummer",
          geboortedatum: "geboortedatum",
          telefoon: "telefoon",
          iban: "iban",
          woning: "woningtype",
          gezin: "gezinssamenstelling",
        };

        const updates: Record<string, string> = {};
        for (const [piiField, dbField] of Object.entries(fieldMap)) {
          const value = body.personalData[piiField];
          if (value && typeof value === "string" && value.trim() && !currentUser[dbField]) {
            updates[dbField] = value.trim();
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.pii_bron = "document";
          await supabase.from("users").update(updates).eq("id", session.user.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
