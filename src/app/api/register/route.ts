import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email en wachtwoord (min. 8 tekens) zijn verplicht." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database niet geconfigureerd." },
      { status: 503 }
    );
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Er bestaat al een account met dit e-mailadres." },
      { status: 409 }
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email,
      name: name || null,
      password_hash,
      provider: "email",
      role: "user",
    })
    .select("id, email, name")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Registratie mislukt. Probeer het opnieuw." },
      { status: 500 }
    );
  }

  return NextResponse.json({ user }, { status: 201 });
}
