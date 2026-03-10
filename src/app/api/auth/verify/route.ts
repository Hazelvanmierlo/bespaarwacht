import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get("token");
  const email = searchParams.get("email");

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://deverzkeringsagent.nl";

  if (!rawToken || !email) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=invalid_link`,
      { status: 302 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=server`,
      { status: 302 }
    );
  }

  // 1. Hash the incoming raw token to compare with stored hash
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // 2. Look up token
  const { data: tokenRecord } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("identifier", normalizedEmail)
    .eq("token", hashedToken)
    .single();

  if (!tokenRecord) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=invalid_token`,
      { status: 302 }
    );
  }

  // 3. Check expiry
  if (new Date(tokenRecord.expires) < new Date()) {
    // Clean up expired token
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("identifier", normalizedEmail)
      .eq("token", hashedToken);

    return NextResponse.redirect(
      `${baseUrl}/login?error=expired`,
      { status: 302 }
    );
  }

  // 4. Delete the token (one-time use)
  await supabase
    .from("verification_tokens")
    .delete()
    .eq("identifier", normalizedEmail)
    .eq("token", hashedToken);

  // 5. Fetch user
  const { data: user } = await supabase
    .from("users")
    .select("id, email, name, password_hash, email_verified")
    .eq("email", normalizedEmail)
    .single();

  if (!user) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=user_not_found`,
      { status: 302 }
    );
  }

  const isFirstVerification = !user.email_verified;

  // 6. Mark email as verified
  await supabase
    .from("users")
    .update({ email_verified: new Date().toISOString() })
    .eq("id", user.id);

  // 7. If user has no password, generate a temporary one
  //    Use first 8 chars of the raw token + "Bw!" as temporary password
  const tmpPassword = rawToken.replace(/-/g, "").substring(0, 8) + "Bw!";

  if (!user.password_hash) {
    const password_hash = await bcrypt.hash(tmpPassword, 12);
    await supabase
      .from("users")
      .update({ password_hash })
      .eq("id", user.id);
  }

  // 8. Send welcome email on first verification
  if (isFirstVerification) {
    try {
      await sendWelcomeEmail(normalizedEmail, user.name ?? undefined);
    } catch (err) {
      // Non-fatal – log and continue
      console.error("Welcome email failed:", err);
    }
  }

  // 9. Redirect to login page with auto-login parameters
  //    tmp param contains the first 8 chars of the raw token (no dashes) + "Bw!"
  const params = new URLSearchParams({
    verified: "true",
    email: normalizedEmail,
    tmp: tmpPassword,
  });

  return NextResponse.redirect(
    `${baseUrl}/login?${params.toString()}`,
    { status: 302 }
  );
}
