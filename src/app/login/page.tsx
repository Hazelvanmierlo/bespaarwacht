"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ShieldIcon, ArrowRightIcon, LockIcon } from "@/components/icons";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }
      // Auto-login after registration
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Ongeldige inloggegevens. Probeer het opnieuw.");
      setLoading(false);
    } else {
      window.location.href = "/account";
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12 bg-bw-bg">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-bw-green flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading text-[28px] font-bold text-bw-deep">
            {mode === "login" ? "Inloggen" : "Account aanmaken"}
          </h1>
          <p className="text-sm text-bw-text-mid mt-1">
            {mode === "login"
              ? "Log in om je polissen en monitoring te bekijken."
              : "Maak een gratis account aan om je analyses op te slaan."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-bw-border p-6 shadow-[0_1px_3px_rgba(15,33,55,.05)]">
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "register" && (
              <div>
                <label className="text-xs font-semibold text-bw-deep block mb-1">Naam</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep bg-white focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                  placeholder="Je naam"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-bw-deep block mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep bg-white focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                placeholder="naam@voorbeeld.nl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-bw-deep block mb-1">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep bg-white focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                placeholder={mode === "register" ? "Minimaal 8 tekens" : "Je wachtwoord"}
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
                  {mode === "login" ? "Inloggen" : "Account aanmaken"}
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Toggle mode */}
        <div className="text-center mt-4 text-sm text-bw-text-mid">
          {mode === "login" ? (
            <>
              Nog geen account?{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-bw-blue font-semibold bg-transparent border-none cursor-pointer font-[inherit] hover:underline"
              >
                Registreer gratis
              </button>
            </>
          ) : (
            <>
              Al een account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-bw-blue font-semibold bg-transparent border-none cursor-pointer font-[inherit] hover:underline"
              >
                Inloggen
              </button>
            </>
          )}
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-bw-text-light">
          <LockIcon className="w-3 h-3" />
          <span>
            Wij beschermen je gegevens. <Link href="/privacy" className="underline">Privacybeleid</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
