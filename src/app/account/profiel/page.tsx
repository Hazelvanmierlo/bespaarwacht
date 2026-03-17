"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  ShieldDownIcon, ArrowRightIcon, CheckIcon, LockIcon,
  User, KeyRound, Bell, Trash2, AlertTriangle, Info, Settings, Home,
} from "@/components/icons";
import type { ReactNode } from "react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  provider?: string;
  postcode?: string | null;
  huisnummer?: string | null;
  woonplaats?: string | null;
  geboortedatum?: string | null;
  woningtype?: string | null;
  gezinssamenstelling?: string | null;
  telefoon?: string | null;
  iban?: string | null;
  adres?: string | null;
  pii_bron?: string | null;
}

type Section = "profiel" | "woongegevens" | "wachtwoord" | "notificaties" | "account";

interface NotificatiePref {
  betereDeal: boolean;
  opzegdatum: boolean;
  maandelijks: boolean;
}

function AlertBanner({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
        type === "success"
          ? "bg-bw-green-bg text-bw-green-strong border border-bw-green/30"
          : "bg-bw-red-bg text-red-700 border border-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckIcon className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
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
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <div className="text-[14px] font-semibold text-bw-deep">{label}</div>
        <div className="text-[12px] text-bw-text-mid mt-0.5 leading-relaxed">{description}</div>
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

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  hint,
  autoComplete,
  disabled,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl border border-bw-border text-[14px] text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all disabled:opacity-50 disabled:bg-bw-bg"
      />
      {hint && <p className="text-[11px] text-bw-text-light mt-1.5">{hint}</p>}
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

  // Woongegevens form state
  const [postcode, setPostcode] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [woonplaats, setWoonplaats] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [woningtype, setWoningtype] = useState("");
  const [gezin, setGezin] = useState("");
  const [woonSaving, setWoonSaving] = useState(false);
  const [woonMsg, setWoonMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Mobile nav
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/account/profile");
      if (res.ok) {
        const { user } = await res.json();
        setProfile(user);
        setNaam(user.name ?? "");
        setEmail(user.email ?? "");
        setPostcode(user.postcode ?? "");
        setHuisnummer(user.huisnummer ?? "");
        setWoonplaats(user.woonplaats ?? "");
        setGeboortedatum(user.geboortedatum ?? "");
        setWoningtype(user.woningtype ?? "");
        setGezin(user.gezinssamenstelling ?? "");
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

  const handleSaveWoongegevens = async (e: React.FormEvent) => {
    e.preventDefault();
    setWoonMsg(null);
    setWoonSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: naam, email,
          postcode, huisnummer, woonplaats, geboortedatum: geboortedatum || null,
          woningtype: woningtype || null, gezinssamenstelling: gezin || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWoonMsg({ type: "error", text: data.error ?? "Opslaan mislukt" });
      } else {
        setProfile(data.user);
        setWoonMsg({ type: "success", text: "Woongegevens opgeslagen." });
      }
    } catch {
      setWoonMsg({ type: "error", text: "Er is een fout opgetreden." });
    } finally {
      setWoonSaving(false);
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

  const navItems: { key: Section; label: string; icon: ReactNode; danger?: boolean }[] = [
    { key: "profiel", label: "Persoonsgegevens", icon: <User className="w-4 h-4" /> },
    { key: "woongegevens", label: "Woon- & persoonsgegevens", icon: <Home className="w-4 h-4" /> },
    { key: "wachtwoord", label: "Wachtwoord", icon: <KeyRound className="w-4 h-4" /> },
    { key: "notificaties", label: "Notificaties", icon: <Bell className="w-4 h-4" /> },
    { key: "account", label: "Account verwijderen", icon: <Trash2 className="w-4 h-4" />, danger: true },
  ];

  const handleNavClick = (key: Section) => {
    setActiveSection(key);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-bw-bg">
      {/* Portal top bar */}
      <header className="bg-white border-b border-bw-border sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
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
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
            >
              &larr; <span className="hidden sm:inline">Mijn dashboard</span><span className="sm:hidden">Terug</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium text-bw-text-light border border-bw-border bg-white cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-bw-bg flex items-center justify-center">
              <Settings className="w-5 h-5 text-bw-text-mid" />
            </div>
            <div>
              <h1 className="font-heading text-[20px] sm:text-[24px] font-bold text-bw-deep leading-tight">
                Instellingen
              </h1>
              <p className="text-[12px] sm:text-[13px] text-bw-text-mid">
                Beheer je gegevens, wachtwoord en meldingsvoorkeuren
              </p>
            </div>
          </div>
        </div>

        {/* Mobile section picker */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-bw-border text-[14px] font-semibold text-bw-deep cursor-pointer font-[inherit]"
          >
            <span className="flex items-center gap-2">
              {navItems.find((n) => n.key === activeSection)?.icon}
              {navItems.find((n) => n.key === activeSection)?.label}
            </span>
            <svg className={`w-4 h-4 text-bw-text-mid transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {mobileNavOpen && (
            <div className="mt-1 bg-white rounded-xl border border-bw-border overflow-hidden shadow-lg">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-[14px] font-medium text-left cursor-pointer bg-transparent font-[inherit] transition-colors border-b border-bw-border last:border-0 ${
                    activeSection === item.key
                      ? "bg-bw-bg text-bw-deep font-semibold"
                      : item.danger
                        ? "text-red-600 hover:bg-red-50"
                        : "text-bw-text-mid hover:text-bw-deep hover:bg-bw-bg"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Desktop sidebar nav */}
          <nav className="hidden lg:block bg-white rounded-xl border border-bw-border p-2 h-fit sticky top-20">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left cursor-pointer bg-transparent font-[inherit] transition-colors ${
                  activeSection === item.key
                    ? "bg-bw-bg text-bw-deep font-semibold"
                    : item.danger
                      ? "text-red-500 hover:text-red-700 hover:bg-red-50"
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
              <div className="space-y-4">
                {/* Auto-extracted data card */}
                <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-bold text-bw-deep mb-1">Jouw gegevens</h2>
                      <p className="text-[13px] text-bw-text-mid">
                        Automatisch uit je documenten gehaald en versleuteld opgeslagen.
                      </p>
                    </div>
                    <Link
                      href="/avg-veilig"
                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-bw-green bg-bw-green-bg no-underline border border-[#BBF7D0]"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                      Encrypted
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ProfileField label="Naam" value={profile?.name} icon="user" />
                    <ProfileField label="E-mailadres" value={profile?.email} icon="mail" />
                    <ProfileField label="Adres" value={profile?.adres} icon="home" />
                    <ProfileField label="Postcode" value={profile?.postcode} icon="map" />
                    <ProfileField label="Woonplaats" value={profile?.woonplaats} icon="map" />
                    <ProfileField label="Huisnummer" value={profile?.huisnummer} icon="home" />
                    <ProfileField label="Geboortedatum" value={profile?.geboortedatum} icon="calendar" masked />
                    <ProfileField label="Telefoon" value={profile?.telefoon} icon="phone" masked />
                    <ProfileField label="IBAN" value={profile?.iban} icon="creditcard" masked />
                    <ProfileField label="Woningtype" value={profile?.woningtype} icon="home" />
                    <ProfileField label="Gezinssamenstelling" value={profile?.gezinssamenstelling} icon="users" />
                  </div>

                  {profile?.pii_bron === "document" && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-bw-blue-light text-[11px] text-bw-blue font-medium">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Gegevens automatisch uit je polis gehaald
                    </div>
                  )}
                </div>

                {/* Edit basic fields */}
                <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6">
                  <h3 className="text-[14px] font-bold text-bw-deep mb-3">Naam of e-mail wijzigen</h3>
                  <form onSubmit={handleSaveProfiel} className="space-y-4">
                    <InputField label="Naam" value={naam} onChange={setNaam} placeholder="Jouw volledige naam" autoComplete="name" />
                    <InputField label="E-mailadres" type="email" value={email} onChange={setEmail} placeholder="jouw@email.nl" autoComplete="email" />
                    {profielMsg && <AlertBanner type={profielMsg.type} message={profielMsg.text} />}
                    <div className="flex justify-end">
                      <button type="submit" disabled={profielSaving} className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue-strong transition-colors disabled:opacity-60">
                        {profielSaving ? "Opslaan..." : "Opslaan"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Metadata */}
                {profile && (
                  <div className="px-4 py-3 rounded-xl bg-bw-bg border border-bw-border text-[12px] text-bw-text-mid flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-bw-deep">Lid sinds </span>
                    {new Date(profile.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    {isGoogleAccount && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-bw-border text-[10px] font-semibold text-bw-text-mid">
                        <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Google account
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section: Woongegevens (read-only, auto-filled from documents) */}
            {activeSection === "woongegevens" && (
              <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6">
                <h2 className="text-[16px] font-bold text-bw-deep mb-1">Woon- &amp; persoonsgegevens</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Deze gegevens worden automatisch uit je documenten gehaald. Upload een polis om je profiel aan te vullen.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileField label="Adres" value={profile?.adres} icon="home" />
                  <ProfileField label="Postcode" value={profile?.postcode} icon="map" />
                  <ProfileField label="Huisnummer" value={profile?.huisnummer} icon="home" />
                  <ProfileField label="Woonplaats" value={profile?.woonplaats} icon="map" />
                  <ProfileField label="Geboortedatum" value={profile?.geboortedatum} icon="calendar" masked />
                  <ProfileField label="Woningtype" value={profile?.woningtype} icon="home" />
                  <ProfileField label="Gezinssamenstelling" value={profile?.gezinssamenstelling} icon="users" />
                </div>

                {(!profile?.postcode || !profile?.woningtype) && (
                  <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-bw-blue-light border border-[#BFDBFE] text-[12px] text-bw-blue">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span>
                      Sommige velden zijn nog niet ingevuld. Upload een polis of energiecontract om je profiel automatisch aan te vullen.
                      <Link href="/upload" className="font-bold text-bw-blue no-underline ml-1 hover:underline">Upload &rarr;</Link>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Section: Wachtwoord */}
            {activeSection === "wachtwoord" && (
              <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6">
                <h2 className="text-[16px] font-bold text-bw-deep mb-1">Wachtwoord wijzigen</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Kies een sterk wachtwoord van minimaal 8 tekens.
                </p>

                {isGoogleAccount ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-bw-bg border border-bw-border">
                    <LockIcon className="w-4 h-4 text-bw-text-mid shrink-0 mt-0.5" />
                    <div className="text-[13px] text-bw-text-mid">
                      Je logt in via Google. Wachtwoorden beheer je via je{" "}
                      <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-bw-blue font-semibold no-underline hover:underline">
                        Google-account
                      </a>.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <InputField
                      label="Huidig wachtwoord"
                      type="password"
                      value={huidigWw}
                      onChange={setHuidigWw}
                      placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      autoComplete="current-password"
                    />
                    <InputField
                      label="Nieuw wachtwoord"
                      type="password"
                      value={nieuwWw}
                      onChange={setNieuwWw}
                      placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      autoComplete="new-password"
                    />
                    <InputField
                      label="Bevestig nieuw wachtwoord"
                      type="password"
                      value={bevestigWw}
                      onChange={setBevestigWw}
                      placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      autoComplete="new-password"
                    />

                    {/* Strength hints */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        ["Minimaal 8 tekens", nieuwWw.length >= 8],
                        ["Hoofdletter", /[A-Z]/.test(nieuwWw)],
                        ["Cijfer", /\d/.test(nieuwWw)],
                        ["Wachtwoorden gelijk", nieuwWw === bevestigWw && bevestigWw.length > 0],
                      ].map(([label, ok]) => (
                        <div key={label as string} className="flex items-center gap-1.5">
                          {ok ? (
                            <CheckIcon className="w-3 h-3 text-bw-green" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border-2 border-bw-border inline-block" />
                          )}
                          <span className={ok ? "text-bw-green-strong font-medium" : "text-bw-text-light"}>
                            {label as string}
                          </span>
                        </div>
                      ))}
                    </div>

                    {wwMsg && <AlertBanner type={wwMsg.type} message={wwMsg.text} />}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={wwSaving}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue-strong transition-colors disabled:opacity-60"
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
              <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6">
                <h2 className="text-[16px] font-bold text-bw-deep mb-1">Meldingsvoorkeuren</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Stel in wanneer je een melding van ons ontvangt.
                </p>

                <div className="divide-y divide-bw-border">
                  <Toggle
                    checked={prefs.betereDeal}
                    onChange={(v) => setPrefs((p) => ({ ...p, betereDeal: v }))}
                    label="Betere deal gevonden"
                    description="Ontvang direct een melding zodra wij een goedkopere verzekering of energieleverancier voor je vinden."
                  />
                  <Toggle
                    checked={prefs.opzegdatum}
                    onChange={(v) => setPrefs((p) => ({ ...p, opzegdatum: v }))}
                    label="Herinnering bij opzegdatum"
                    description="We herinneren je 1 maand van tevoren zodat je op tijd kunt opzeggen of overstappen."
                  />
                  <Toggle
                    checked={prefs.maandelijks}
                    onChange={(v) => setPrefs((p) => ({ ...p, maandelijks: v }))}
                    label="Maandelijkse samenvatting"
                    description="Ontvang 1x per maand een overzicht van je polissen en je positie ten opzichte van de markt."
                  />
                </div>

                <div className="mt-5 flex items-start gap-2 px-4 py-3 rounded-xl bg-bw-bg border border-bw-border text-[12px] text-bw-text-mid">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-bw-text-mid" />
                  <span>
                    E-mail notificaties worden binnenkort volledig geactiveerd. Je voorkeuren worden alvast opgeslagen.
                  </span>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={() => alert("Voorkeuren opgeslagen")}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue-strong transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            )}

            {/* Section: Account verwijderen */}
            {activeSection === "account" && (
              <div className="bg-white rounded-2xl border-2 border-red-200 p-5 sm:p-6">
                <h2 className="text-[16px] font-bold text-red-700 mb-1">Account verwijderen</h2>
                <p className="text-[13px] text-bw-text-mid mb-5 leading-relaxed">
                  Dit is permanent. Al je opgeslagen analyses, polisgegevens en voorkeuren worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.
                </p>

                {!deleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-red-50 text-red-700 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    Account verwijderen
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-[14px] font-semibold text-red-700 mb-1">
                        Weet je het zeker?
                      </p>
                      <p className="text-[12px] text-red-600">
                        Typ <strong>VERWIJDER</strong> om je account en alle bijbehorende data definitief te verwijderen.
                      </p>
                    </div>

                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Typ VERWIJDER"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 text-[14px] text-bw-deep placeholder-red-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm(false);
                          setDeleteInput("");
                        }}
                        className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white cursor-pointer hover:bg-bw-bg transition-colors"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteInput !== "VERWIJDER" || deleting}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Verwijderen..." : "Definitief verwijderen"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Privacy footer */}
            <div className="bg-white rounded-xl border border-bw-border p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <LockIcon className="w-3.5 h-3.5 text-bw-text-mid" />
                <span className="text-xs font-bold text-bw-deep">Jouw privacy</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                {[
                  ["Geen verkoop van data", "Wij verkopen nooit je gegevens aan derden"],
                  ["Recht op verwijdering", "Verwijder al je data met \u00e9\u00e9n klik"],
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

/* ── Profile Field (read-only display) ── */
function ProfileField({
  label,
  value,
  icon,
  masked,
}: {
  label: string;
  value?: string | null;
  icon: string;
  masked?: boolean;
}) {
  const isEmpty = !value;
  const displayValue = isEmpty
    ? "Nog niet bekend"
    : masked
    ? value.slice(0, 4) + "\u2022".repeat(Math.max(0, value.length - 4))
    : value;

  return (
    <div className={`px-3.5 py-3 rounded-xl ${isEmpty ? "bg-bw-bg" : "bg-[#F0FDF4]"} border ${isEmpty ? "border-bw-border border-dashed" : "border-[#D1FAE5]"}`}>
      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-0.5 flex items-center gap-1">
        {label}
        {!isEmpty && (
          <svg className="w-2.5 h-2.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </div>
      <div className={`text-[13px] font-semibold leading-tight truncate ${isEmpty ? "text-bw-text-light" : "text-bw-deep"}`}>
        {displayValue}
      </div>
    </div>
  );
}
