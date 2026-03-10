"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ShieldIcon, ArrowRightIcon, LockIcon } from "@/components/icons";

// ─── Step types ────────────────────────────────────────────────────────────

type Step =
  | "email"            // Step 1: enter email
  | "password"         // Step 2a: existing user with password
  | "link_sent"        // Step 2b: new user / passwordless – link was sent
  | "auto_logging_in"; // Transient: auto-submitting after verification redirect

// ─── Component ─────────────────────────────────────────────────────────────

function LoginPageInner() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const autoSubmitRef = useRef(false);

  // ── Handle ?verified=true&email=XXX&tmp=XXX from /api/auth/verify ────────
  useEffect(() => {
    const verified = searchParams.get("verified");
    const emailParam = searchParams.get("email");
    const tmpParam = searchParams.get("tmp");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      const messages: Record<string, string> = {
        invalid_link: "De verificatielink is ongeldig.",
        invalid_token: "De verificatielink is ongeldig of al gebruikt.",
        expired: "De verificatielink is verlopen. Vraag een nieuwe aan.",
        user_not_found: "Gebruiker niet gevonden. Probeer opnieuw te registreren.",
        server: "Er is een serverfout opgetreden. Probeer het later opnieuw.",
      };
      setError(messages[errorParam] ?? "Er is iets misgegaan.");
      return;
    }

    if (verified === "true" && emailParam && tmpParam) {
      // Auto-login flow: we have email + temporary password from verify endpoint
      if (autoSubmitRef.current) return;
      autoSubmitRef.current = true;

      setEmail(emailParam);
      setPassword(tmpParam);
      setStep("auto_logging_in");
      setVerifiedSuccess(true);

      // Slight delay so state updates propagate, then auto-login
      setTimeout(async () => {
        const result = await signIn("credentials", {
          email: emailParam,
          password: tmpParam,
          redirect: false,
        });

        if (result?.error) {
          // Auto-login failed – fall back to showing password step with success message
          setStep("password");
          setPassword("");
          setError("Automatisch inloggen mislukt. Vul je wachtwoord in.");
        } else {
          await redirectAfterLogin();
        }
      }, 200);
    } else if (verified === "true" && emailParam) {
      // Verified but no tmp param – just show success message
      setEmail(emailParam);
      setVerifiedSuccess(true);
      setStep("password");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redirect helper ───────────────────────────────────────────────────────

  async function redirectAfterLogin() {
    try {
      const sess = await fetch("/api/auth/session").then((r) => r.json());
      if (sess?.user?.role === "admin") {
        window.location.href = "/admin";
        return;
      }
    } catch {
      /* fall through to /account */
    }
    window.location.href = "/account";
  }

  // ── Step 1: check email ───────────────────────────────────────────────────

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Er is iets misgegaan. Probeer het opnieuw.");
        return;
      }

      if (data.isNewUser) {
        // New user: no password yet, just sent link
        setStep("link_sent");
      } else {
        // Existing user with password: ask for password
        // (We also sent a magic link, but they can choose to type password)
        setStep("password");
      }
    } catch {
      setError("Netwerkfout. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2a: password login ───────────────────────────────────────────────

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Onjuist wachtwoord. Probeer het opnieuw.");
      setLoading(false);
    } else {
      await redirectAfterLogin();
    }
  }

  // ── Resend magic link ─────────────────────────────────────────────────────

  async function handleResendLink() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Opnieuw verzenden mislukt.");
      }
    } catch {
      setError("Netwerkfout. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bw-bg">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-bw-green flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading text-[28px] font-bold text-bw-deep">
            {step === "link_sent" ? "Check je inbox" : "Inloggen"}
          </h1>
          <p className="text-sm text-bw-text-mid mt-1">
            {step === "link_sent"
              ? `We hebben een link gestuurd naar ${email}`
              : step === "password"
              ? `Vul je wachtwoord in voor ${email}`
              : "Log in of maak gratis een account aan."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-bw-border p-6 shadow-[0_1px_3px_rgba(15,33,55,.05)]">

          {/* ── Auto-logging-in state ── */}
          {step === "auto_logging_in" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-6 h-6 border-2 border-bw-green border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-bw-text-mid text-center">
                E-mailadres bevestigd! Je wordt automatisch ingelogd…
              </p>
            </div>
          )}

          {/* ── Link sent state ── */}
          {step === "link_sent" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-bw-green-bg border border-[#BBF7D0] p-4 text-sm text-bw-green-dark">
                <p className="font-semibold mb-1">Verificatielink verstuurd! ✉️</p>
                <p className="text-[13px] leading-relaxed">
                  We hebben een e-mail gestuurd naar <strong>{email}</strong>.
                  Klik op de link in de e-mail om in te loggen. De link is 1 uur geldig.
                </p>
              </div>
              <p className="text-xs text-bw-text-light text-center">
                Geen e-mail ontvangen?{" "}
                <button
                  onClick={handleResendLink}
                  disabled={loading}
                  className="text-bw-blue font-semibold bg-transparent border-none cursor-pointer font-[inherit] hover:underline disabled:opacity-50"
                >
                  {loading ? "Verzenden…" : "Opnieuw versturen"}
                </button>
              </p>
              <button
                onClick={() => { setStep("email"); setEmail(""); setError(""); }}
                className="w-full text-center text-sm text-bw-text-mid bg-transparent border-none cursor-pointer font-[inherit] hover:text-bw-deep transition-colors py-1"
              >
                ← Terug
              </button>
            </div>
          )}

          {/* ── Email step ── */}
          {step === "email" && (
            <>
              {/* Google */}
              <button
                onClick={() => signIn("google", { callbackUrl: "/account" })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-bw-border bg-white text-sm font-semibold text-bw-deep cursor-pointer font-[inherit] hover:bg-bw-bg hover:border-[#CBD5E1] transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Doorgaan met Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-bw-border" />
                <span className="text-xs text-bw-text-light">of met e-mail</span>
                <div className="flex-1 h-px bg-bw-border" />
              </div>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-bw-deep block mb-1">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep bg-white focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                    placeholder="naam@voorbeeld.nl"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-bw-red-bg border border-[#FECACA] text-xs text-bw-red font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white border-none cursor-pointer font-[inherit] hover:bg-bw-orange-strong transition-all disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Doorgaan
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── Password step ── */}
          {step === "password" && (
            <div className="flex flex-col gap-3">
              {/* Verified success banner */}
              {verifiedSuccess && (
                <div className="rounded-xl bg-bw-green-bg border border-[#BBF7D0] px-3 py-2.5 text-xs text-bw-green-dark font-medium">
                  E-mailadres bevestigd! Vul je wachtwoord in om in te loggen.
                </div>
              )}

              <div className="text-sm text-bw-text-mid -mb-1">
                Inloggen als{" "}
                <span className="font-semibold text-bw-deep">{email}</span>
              </div>

              {/* Also-sent-magic-link info for existing users */}
              {!verifiedSuccess && (
                <div className="rounded-xl bg-bw-blue-light border border-[#BFDBFE] px-3 py-2.5 text-xs text-bw-blue font-medium">
                  We hebben ook een inloglink naar je e-mail gestuurd. Klik op de link om direct in te loggen.
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-bw-deep block mb-1">
                    Wachtwoord
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep bg-white focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                    placeholder="Je wachtwoord"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-bw-red-bg border border-[#FECACA] text-xs text-bw-red font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white border-none cursor-pointer font-[inherit] hover:bg-bw-orange-strong transition-all disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Inloggen
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => { setStep("email"); setPassword(""); setError(""); setVerifiedSuccess(false); }}
                className="w-full text-center text-sm text-bw-text-mid bg-transparent border-none cursor-pointer font-[inherit] hover:text-bw-deep transition-colors py-1"
              >
                ← Ander e-mailadres gebruiken
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-bw-text-light">
          <LockIcon className="w-3 h-3" />
          <span>
            Wij beschermen je gegevens.{" "}
            <Link href="/privacy" className="underline">
              Privacybeleid
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense — required by Next.js App Router for useSearchParams()
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bw-bg">
        <div className="w-8 h-8 border-2 border-bw-green border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
