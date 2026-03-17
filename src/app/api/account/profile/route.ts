import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, created_at, provider, postcode, huisnummer, woonplaats, geboortedatum, woningtype, gezinssamenstelling, telefoon, iban, adres, pii_bron")
    .eq("id", session.user.id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const body = await req.json();
  const updates: Record<string, string | null> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }

  // Extended profile fields
  const stringFields = ["postcode", "huisnummer", "woonplaats", "woningtype", "gezinssamenstelling", "telefoon", "iban", "adres"] as const;
  for (const field of stringFields) {
    if (body[field] !== undefined) {
      updates[field] = typeof body[field] === "string" && body[field].trim() ? body[field].trim() : null;
    }
  }
  if (body.geboortedatum !== undefined) {
    updates.geboortedatum = body.geboortedatum || null;
  }

  if (typeof body.email === "string" && body.email.trim()) {
    const newEmail = body.email.trim().toLowerCase();
    // Check if email is already taken by another user
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", newEmail)
      .neq("id", session.user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Dit e-mailadres is al in gebruik" }, { status: 409 });
    }

    updates.email = newEmail;
    updates.email_verified = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Geen geldige velden om bij te werken" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.user.id)
    .select("id, name, email, created_at, provider, postcode, huisnummer, woonplaats, geboortedatum, woningtype, gezinssamenstelling, telefoon, iban, adres, pii_bron")
    .single();

  if (error) {
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  const { currentPassword, newPassword, confirmPassword } = await req.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Alle wachtwoordvelden zijn verplicht" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Nieuwe wachtwoorden komen niet overeen" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Nieuw wachtwoord moet minimaal 8 tekens bevatten" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("password_hash, provider")
    .eq("id", session.user.id)
    .single();

  if (!user) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }

  if (user.provider !== "email" || !user.password_hash) {
    return NextResponse.json(
      { error: "Wachtwoord wijzigen is niet mogelijk voor Google-accounts" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Huidig wachtwoord is onjuist" }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  const { error } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Wachtwoord wijzigen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database niet beschikbaar" }, { status: 503 });
  }

  // Delete all saved analyses first
  await supabase.from("saved_analyses").delete().eq("user_id", session.user.id);

  // Delete the user
  const { error } = await supabase.from("users").delete().eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Account verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
