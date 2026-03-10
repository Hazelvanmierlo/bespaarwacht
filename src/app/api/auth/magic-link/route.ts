import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-mailadres is verplicht." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database niet geconfigureerd." },
        { status: 503 }
      );
    }

    // 1. Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, email_verified")
      .eq("email", normalizedEmail)
      .single();

    let isNewUser = false;

    if (!existingUser) {
      // 2. Create new user
      isNewUser = true;
      const { error: insertError } = await supabase.from("users").insert({
        email: normalizedEmail,
        provider: "email",
        role: "user",
        email_verified: null,
      });

      if (insertError) {
        console.error("Error creating user:", insertError);
        return NextResponse.json(
          { error: "Account aanmaken mislukt. Probeer het opnieuw." },
          { status: 500 }
        );
      }
    }

    // 3. Generate raw token
    const rawToken = crypto.randomUUID();

    // 4. Hash the token before storing
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Delete any existing tokens for this email
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("identifier", normalizedEmail);

    // Store hashed token in verification_tokens
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const { error: tokenError } = await supabase
      .from("verification_tokens")
      .insert({
        identifier: normalizedEmail,
        token: hashedToken,
        expires,
      });

    if (tokenError) {
      console.error("Error storing token:", tokenError);
      return NextResponse.json(
        { error: "Token aanmaken mislukt. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    // 5. Send verification email (with raw token)
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://deverzkeringsagent.nl";

    await sendVerificationEmail(normalizedEmail, rawToken, baseUrl);

    return NextResponse.json({ ok: true, isNewUser });
  } catch (err) {
    console.error("magic-link error:", err);
    return NextResponse.json(
      { error: "Er is iets misgegaan. Probeer het opnieuw." },
      { status: 500 }
    );
  }
}
