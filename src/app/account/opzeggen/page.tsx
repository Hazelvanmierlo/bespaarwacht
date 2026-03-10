"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ShieldDownIcon, CheckIcon, LockIcon } from "@/components/icons";

interface OpzegForm {
  naam: string;
  adres: string;
  postcode: string;
  woonplaats: string;
  leverancier: string;
  klantnummer: string;
  einddatum: string;
  datum: string;
  type: "energie" | "verzekering" | "overig";
}

const TYPE_LABELS: Record<OpzegForm["type"], string> = {
  energie: "Energiecontract",
  verzekering: "Verzekering",
  overig: "Overig contract",
};

const today = () => new Date().toISOString().split("T")[0];

const defaultForm: OpzegForm = {
  naam: "",
  adres: "",
  postcode: "",
  woonplaats: "",
  leverancier: "",
  klantnummer: "",
  einddatum: "",
  datum: today(),
  type: "energie",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-bw-deep mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-bw-text-light mt-1">{hint}</p>}
    </div>
  );
}

export default function OpzeggenPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<OpzegForm>(defaultForm);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
    // Pre-fill name from session
    if (session?.user?.name) {
      setForm((f) => ({ ...f, naam: session.user!.name ?? "" }));
    }
  }, [session, status]);

  const set = (field: keyof OpzegForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setBrief(null);

    try {
      const res = await fetch("/api/account/opzegbrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Genereren mislukt");
      } else {
        setBrief(data.brief);
      }
    } catch {
      setError("Er is een fout opgetreden.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!brief) return;
    await navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!brief) return;
    const blob = new Blob([brief], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opzegbrief-${form.leverancier.replace(/\s+/g, "-").toLowerCase() || "contract"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setBrief(null);
    setError(null);
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-lg border border-bw-border text-sm text-bw-deep placeholder-bw-text-light focus:outline-none focus:border-bw-blue focus:ring-2 focus:ring-bw-blue/10 transition-all";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bw-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-bw-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="inline-flex items-center gap-1 text-sm text-bw-text-mid no-underline hover:text-bw-deep transition-colors mb-3"
          >
            ← Terug naar account
          </Link>
          <h1 className="font-heading text-[26px] font-bold text-bw-deep leading-tight">
            Opzegservice
          </h1>
          <p className="text-sm text-bw-text-mid mt-1">
            Genereer in één klik een professionele opzegbrief voor je contract of verzekering.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Form or result */}
          <div>
            {!brief ? (
              <div className="bg-white rounded-xl border border-bw-border p-6">
                <h2 className="text-base font-bold text-bw-deep mb-1">Opzegbrief genereren</h2>
                <p className="text-[13px] text-bw-text-mid mb-5">
                  Vul de gegevens in en wij stellen een formele opzegbrief voor je op.
                </p>

                <form onSubmit={handleGenerate} className="space-y-4">
                  <Field label="Type contract">
                    <select
                      value={form.type}
                      onChange={set("type")}
                      className={inputCls}
                    >
                      {(Object.entries(TYPE_LABELS) as [OpzegForm["type"], string][]).map(
                        ([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Leverancier / verzekeraar">
                      <input
                        type="text"
                        value={form.leverancier}
                        onChange={set("leverancier")}
                        placeholder="bijv. Vattenfall, Centraal Beheer"
                        required
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Klantnummer / polisnummer" hint="Optioneel maar aanbevolen">
                      <input
                        type="text"
                        value={form.klantnummer}
                        onChange={set("klantnummer")}
                        placeholder="bijv. 123456789"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="border-t border-bw-border pt-4">
                    <p className="text-[11px] text-bw-text-light uppercase tracking-wider mb-3 font-semibold">
                      Jouw gegevens
                    </p>
                    <div className="space-y-4">
                      <Field label="Volledige naam">
                        <input
                          type="text"
                          value={form.naam}
                          onChange={set("naam")}
                          placeholder="Voornaam Achternaam"
                          required
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Adres">
                        <input
                          type="text"
                          value={form.adres}
                          onChange={set("adres")}
                          placeholder="Straatnaam 1"
                          required
                          className={inputCls}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Postcode">
                          <input
                            type="text"
                            value={form.postcode}
                            onChange={set("postcode")}
                            placeholder="1234 AB"
                            required
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Woonplaats">
                          <input
                            type="text"
                            value={form.woonplaats}
                            onChange={set("woonplaats")}
                            placeholder="Amsterdam"
                            required
                            className={inputCls}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Datum brief"
                      hint="Standaard vandaag"
                    >
                      <input
                        type="date"
                        value={form.datum}
                        onChange={set("datum")}
                        required
                        className={inputCls}
                      />
                    </Field>
                    <Field
                      label="Gewenste einddatum"
                      hint="Leeg laten = zo snel mogelijk"
                    >
                      <input
                        type="date"
                        value={form.einddatum}
                        onChange={set("einddatum")}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      <span>⚠</span> {error}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold bg-bw-orange text-white cursor-pointer hover:bg-bw-orange-strong transition-colors disabled:opacity-60"
                    >
                      {loading ? "Genereren..." : "📄 Opzegbrief genereren"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-bw-border p-4">
                  <span className="text-sm font-semibold text-bw-deep flex-1">
                    Opzegbrief gegenereerd
                  </span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-bw-blue text-white cursor-pointer hover:bg-bw-blue/90 transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5" /> Gekopieerd!
                      </>
                    ) : (
                      "📋 Kopieer"
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-bw-green text-white cursor-pointer hover:bg-bw-green/90 transition-colors"
                  >
                    ⬇ Download .txt
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-bw-text-mid border border-bw-border bg-white cursor-pointer hover:bg-bw-bg transition-colors"
                  >
                    Opnieuw
                  </button>
                </div>

                {/* Letter preview */}
                <div className="bg-white rounded-xl border border-bw-border p-8">
                  <pre className="font-mono text-[13px] text-bw-deep whitespace-pre-wrap leading-relaxed">
                    {brief}
                  </pre>
                </div>

                <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-bw-bg border border-bw-border text-[12px] text-bw-text-mid">
                  <span>💡</span>
                  <span>
                    Tip: Stuur de brief aangetekend op of via e-mail met leesbevestiging. Bewaar een kopie voor je eigen administratie.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tips sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-bw-border p-5">
              <h3 className="text-sm font-bold text-bw-deep mb-3">📋 Tips bij opzeggen</h3>
              <ul className="space-y-2.5 text-[13px] text-bw-text-mid">
                {[
                  {
                    title: "Opzegtermijn",
                    text: "De meeste contracten hebben een opzegtermijn van 1 maand. Controleer je contract voor de exacte termijn.",
                  },
                  {
                    title: "Energiecontract",
                    text: "Variabele contracten zijn maandelijks opzegbaar. Vaste contracten hebben vaak een opzegtermijn van 1 maand voor einddatum.",
                  },
                  {
                    title: "Verzekering",
                    text: "Verzekeringen zijn doorgaans opzegbaar per contractvervaldatum of bij premiewijziging, met 1 maand opzegtermijn.",
                  },
                  {
                    title: "Bevestiging",
                    text: "Vraag altijd om een schriftelijke bevestiging. Bewaar dit bewijs minstens 1 jaar.",
                  },
                  {
                    title: "Aangetekend",
                    text: "Bij twijfel: stuur de brief aangetekend. Dan heb je een bewijs van verzending.",
                  },
                ].map(({ title, text }) => (
                  <li key={title} className="flex items-start gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-bw-green shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold text-bw-deep">{title}:</span> {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-bw-border p-5">
              <h3 className="text-sm font-bold text-bw-deep mb-2">⚡ Nieuw contract nodig?</h3>
              <p className="text-[13px] text-bw-text-mid mb-3">
                Vergelijk direct de beste energietarieven of verzekeringen en stap over zonder gedoe.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/upload?type=energie"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-bw-green text-white no-underline hover:bg-bw-green/90 transition-colors"
                >
                  ⚡ Energie vergelijken
                </Link>
                <Link
                  href="/upload?type=verzekering"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors"
                >
                  🛡️ Verzekering vergelijken
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-bw-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <LockIcon className="w-3.5 h-3.5 text-bw-text-mid" />
                <span className="text-xs font-bold text-bw-deep">Privacy</span>
              </div>
              <p className="text-[11px] text-bw-text-mid">
                Je brief wordt niet opgeslagen op onze servers. De gegenereerde tekst blijft op jouw apparaat.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
