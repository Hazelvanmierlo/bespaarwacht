"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ShieldDownIcon, ArrowRightIcon, CheckIcon, LockIcon } from "@/components/icons";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  provider?: string;
}

type Section = "profiel" | "wachtwoord" | "notificaties" | "account";

interface NotificatiePref {
  betereDeal: boolean;
  opzegdatum: boolean;
  maandelijks: boolean;
}

function AlertBanner({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
        type === "success"
          ? "bg-bw-green-bg text-bw-green-strong border border-bw-green/30"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckIcon className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <span className="shrink-0">⚠</span>
      )}
      {message}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-semibold text-bw-deep">{label}</div>
        <div className="text-xs text-bw-text-mid mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          checked ? "bg-bw-green" : "bg-bw-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function ProfielPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("profiel");

  // Profile form state
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [profielSaving, setProfielSaving] = useState(false);
  const [profielMsg, setProfielMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form state
  const [huidigWw, setHuidigWw] = useState("");
  const [nieuwWw, setNieuwWw] = useState("");
  const [bevestigWw, setBevestigWw] = useState("");
  const [wwSaving, setWwSaving] = useState(false);
  const [wwMsg, setWwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification prefs
  const [prefs, setPrefs] = useState<NotificatiePref>({
    betereDeal: true,
    opzegdatum: true,
    maandelijks: false,
  });

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/account/profile");
      if (res.ok) {
        const { user } = await res.json();
        setProfile(user);
        setNaam(user.name ?? "");
        setEmail(user.email ?? "");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
    if (session?.user) {
      fetchProfile();
    }
  }, [session, status, fetchProfile]);

  const handleSaveProfiel = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfielMsg(null);
    setProfielSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: naam, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfielMsg({ type: "error", text: data.error ?? "Opslaan mislukt" });
      } else {
        setProfile(data.user);
        setProfielMsg({ type: "success", text: "Profiel succesvol opgeslagen." });
      }
    } catch {
      setProfielMsg({ type: "error", text: "Er is een fout opgetreden." });
    } finally {
      setProfielSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setWwMsg(null);

    if (nieuwWw !== bevestigWw) {
      setWwMsg({ type: "error", text: "Nieuwe wachtwoorden komen niet overeen." });
      return;
    }
    if (nieuwWw.length < 8) {
      setWwMsg({ type: "error", text: "Wachtwoord moet minimaal 8 tekens bevatten." });
      return;
    }

    setWwSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: huidigWw,
          newPassword: nieuwWw,
          confirmPassword: bevestigWw,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWwMsg({ type: "error", text: data.error ?? "Wachtwoord wijzigen mislukt." });
      } else {
        setWwMsg({ type: "success", text: "Wachtwoord succesvol gewijzigd." });
        setHuidigWw("");
        setNieuwWw("");
        setBevestigWw("");
      }
    } catch {
      setWwMsg({ type: "error", text: "Er is een fout opgetreden." });
    } finally {
      setWwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "VERWIJDER") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/profile", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      }
    } catch {
      setDeleting(false);
    }
  };

  const isGoogleAccount = profile?.provider === "google";

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-bw-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-bw-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "profiel", label: "Persoonsgegevens", icon: "👤" },
    { key: "wachtwoord", label: "Wachtwoord", icon: "🔑" },
    { key: "notificaties", label: "Notificaties", icon: "🔔" },
    { key: "account", label: "Account verwijderen", icon: "🗑️" },
  ];

  return (
    <div className="min-h-screen bg-bw-bg">
      {/* Portal top bar */}
      <header className="bg-white border-b border-bw-border sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 no-underline text-bw-deep">
            <div className="w-8 h-8 rounded-lg bg-bw-blue flex items-center justify-center">
              <ShieldDownIcon />
            </div>
            <span className="font-heading font-bold text-[15px] tracking-[-0.3px] hidden sm:inline">
              DeVerzekerings<span className="text-bw-blue">Agent</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
            >
              ← Mijn account
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-2 rounded-lg text-[13px] font-medium text-bw-text-light border border-bw-border bg-white cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="inline-flex items-center gap-1 text-sm text-bw-text-mid no-underline hover:text-bw-deep transition-colors mb-3"
          >
            ← Terug naar account
          </Link>
          <h1 className="font-heading text-[26px] font-bold text-bw-deep leading-tight">
            Instellingen & profiel
          </h1>
          <p className="text-sm text-bw-text-mid mt-1">
            Beheer je persoonlijke gegevens, wachtwoord en notificatievoorkeuren
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar nav */}
          <nav className="bg-white rounded-xl border border-bw-border p-2 h-fit lg:sticky lg:top-20">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left cursor-pointer bg-transparent font-[inherit] transition-colors ${
                  activeSection === item.key
                    ? "bg-bw-bg text-bw-deep font-semibold"
                    : "text-bw-text-mid hover:text-bw-deep hover:bg-bw-bg"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
                {activeSection === item.key && (
                  <ArrowRightIcon className="w-3.5 h-3.5 ml-auto text-bw-blue" />
                )}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <div className="space-y-6">
            {/* Section: Persoonsgegevens */}
            {activeSection === "profiel" && (
              <div className="bg-white rounded-xl border border-bw-border p-6">
                <h2 className="text-base font-bold text-bw-deep mb-1">Persoonsgegevens</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Wijzig je naam of e-mailadres. Bij een e-mailwijziging kan een herverificatie vereist zijn.
                </p>

                <form onSubmit={handleSaveProfiel} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-bw-deep mb-1.5">
                      Naam
                    </label>
                    <input
                      type="text"
                      value={naam}
                      onChange={(e) => setNaam(e.target.value)}
                      placeholder="Jouw volledige naam"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-bw-deep mb-1.5">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jouw@email.nl"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                    />
                    <p className="text-[11px] text-bw-text-light mt-1.5">
                      Na een e-mailwijziging kan herverificatie vereist zijn. Je wordt uitgelogd als het adres verandert.
                    </p>
                  </div>

                  {profielMsg && (
                    <AlertBanner type={profielMsg.type} message={profielMsg.text} />
                  )}

                  {profile && (
                    <div className="px-4 py-3 rounded-lg bg-bw-bg border border-bw-border text-[12px] text-bw-text-mid">
                      <span className="font-semibold text-bw-deep">Account aangemaakt: </span>
                      {new Date(profile.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {isGoogleAccount && (
                        <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-bw-border text-[10px] font-semibold text-bw-text-mid">
                          Google account
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={profielSaving}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue/90 transition-colors disabled:opacity-60"
                    >
                      {profielSaving ? "Opslaan..." : "Opslaan"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Section: Wachtwoord */}
            {activeSection === "wachtwoord" && (
              <div className="bg-white rounded-xl border border-bw-border p-6">
                <h2 className="text-base font-bold text-bw-deep mb-1">Wachtwoord wijzigen</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Kies een sterk wachtwoord van minimaal 8 tekens.
                </p>

                {isGoogleAccount ? (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-bw-bg border border-bw-border">
                    <LockIcon className="w-4 h-4 text-bw-text-mid shrink-0 mt-0.5" />
                    <div className="text-sm text-bw-text-mid">
                      Je logt in via Google. Wachtwoorden beheer je via je Google-account.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-bw-deep mb-1.5">
                        Huidig wachtwoord
                      </label>
                      <input
                        type="password"
                        value={huidigWw}
                        onChange={(e) => setHuidigWw(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-bw-deep mb-1.5">
                        Nieuw wachtwoord
                      </label>
                      <input
                        type="password"
                        value={nieuwWw}
                        onChange={(e) => setNieuwWw(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-bw-deep mb-1.5">
                        Bevestig nieuw wachtwoord
                      </label>
                      <input
                        type="password"
                        value={bevestigWw}
                        onChange={(e) => setBevestigWw(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all"
                      />
                    </div>

                    {/* Strength hints */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-bw-text-mid">
                      {[
                        ["Minimaal 8 tekens", nieuwWw.length >= 8],
                        ["Hoofdletter", /[A-Z]/.test(nieuwWw)],
                        ["Cijfer", /\d/.test(nieuwWw)],
                        ["Wachtwoorden gelijk", nieuwWw === bevestigWw && bevestigWw.length > 0],
                      ].map(([label, ok]) => (
                        <div key={label as string} className="flex items-center gap-1.5">
                          <span className={ok ? "text-bw-green" : "text-bw-border"}>
                            {ok ? "✓" : "○"}
                          </span>
                          <span className={ok ? "text-bw-green-strong" : ""}>{label as string}</span>
                        </div>
                      ))}
                    </div>

                    {wwMsg && <AlertBanner type={wwMsg.type} message={wwMsg.text} />}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={wwSaving}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue/90 transition-colors disabled:opacity-60"
                      >
                        {wwSaving ? "Opslaan..." : "Wachtwoord wijzigen"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Section: Notificaties */}
            {activeSection === "notificaties" && (
              <div className="bg-white rounded-xl border border-bw-border p-6">
                <h2 className="text-base font-bold text-bw-deep mb-1">Notificatievoorkeuren</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Stel in wanneer je een e-mail van ons ontvangt.
                </p>

                <div className="divide-y divide-bw-border">
                  <Toggle
                    checked={prefs.betereDeal}
                    onChange={(v) => setPrefs((p) => ({ ...p, betereDeal: v }))}
                    label="E-mail bij betere deal gevonden"
                    description="Ontvang een melding zodra wij een goedkopere verzekering of energieleverancier voor je vinden."
                  />
                  <Toggle
                    checked={prefs.opzegdatum}
                    onChange={(v) => setPrefs((p) => ({ ...p, opzegdatum: v }))}
                    label="E-mail bij opzegdatum nadering"
                    description="We herinneren je tijdig zodat je op tijd kunt opzeggen of overstappen."
                  />
                  <Toggle
                    checked={prefs.maandelijks}
                    onChange={(v) => setPrefs((p) => ({ ...p, maandelijks: v }))}
                    label="Maandelijkse samenvatting"
                    description="Ontvang één keer per maand een overzicht van je polissen en de marktpositie."
                  />
                </div>

                <div className="mt-5 flex items-start gap-2 px-4 py-3 rounded-lg bg-bw-bg border border-bw-border text-[12px] text-bw-text-mid">
                  <span>ℹ️</span>
                  <span>
                    Voorkeuren worden opgeslagen in je account. Koppelingen worden in een volgende update volledig geactiveerd.
                  </span>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={() => alert("Voorkeuren opgeslagen (interface only)")}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue/90 transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            )}

            {/* Section: Account verwijderen */}
            {activeSection === "account" && (
              <div className="bg-white rounded-xl border border-red-200 p-6">
                <h2 className="text-base font-bold text-red-700 mb-1">Account verwijderen</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Het verwijderen van je account is permanent. Al je opgeslagen analyses en gegevens worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.
                </p>

                {!deleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-50 text-red-700 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    Account verwijderen
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-sm font-semibold text-red-700 mb-1">
                        Ben je zeker?
                      </p>
                      <p className="text-[12px] text-red-600">
                        Typ <strong>VERWIJDER</strong> om je account definitief te verwijderen.
                      </p>
                    </div>

                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Typ VERWIJDER"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-red-200 text-sm text-bw-deep placeholder-red-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm(false);
                          setDeleteInput("");
                        }}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-bw-text-mid border border-bw-border bg-white cursor-pointer hover:bg-bw-bg transition-colors"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteInput !== "VERWIJDER" || deleting}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Verwijderen..." : "Definitief verwijderen"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Privacy footer */}
            <div className="bg-white rounded-xl border border-bw-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <LockIcon className="w-3.5 h-3.5 text-bw-text-mid" />
                <span className="text-xs font-bold text-bw-deep">Jouw privacy</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                {[
                  ["Geen verkoop van data", "Wij verkopen nooit je gegevens aan derden"],
                  ["Recht op verwijdering", "Verwijder al je data met één klik"],
                  ["AVG-compliant", "Alle verwerkingen conform de AVG"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-1.5">
                    <CheckIcon className="w-3 h-3 text-bw-green shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-bw-deep">{title}</span>
                      <span className="text-bw-text-light"> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
