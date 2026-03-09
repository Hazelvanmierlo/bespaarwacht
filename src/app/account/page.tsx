"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { UploadIcon, ShieldIcon, ArrowRightIcon, CheckIcon, LockIcon, TrashIcon, PulseDot } from "@/components/icons";
import type { SavedPolis } from "@/lib/types";

// ── Testdata ──────────────────────────────────────────────
interface DemoPolis {
  id: string;
  type: "Inboedelverzekering" | "Opstalverzekering" | "Aansprakelijkheidsverzekering" | "Reisverzekering";
  verzekeraar: string;
  premieMnd: number;
  dekking: string;
  eigenRisico: number;
  ingangsdatum: string;
  opzegdatum: string;
  besteAlt: { naam: string; premieMnd: number };
  besparingJaar: number;
  status: "saving" | "action" | "minor" | "good";
}

const DEMO_POLISSEN: DemoPolis[] = [
  {
    id: "demo-1",
    type: "Inboedelverzekering",
    verzekeraar: "OHRA",
    premieMnd: 17.53,
    dekking: "Inboedel €60.000 — Allrisk",
    eigenRisico: 150,
    ingangsdatum: "1 jul 2021",
    opzegdatum: "1 jul 2026",
    besteAlt: { naam: "a.s.r.", premieMnd: 8.42 },
    besparingJaar: 109,
    status: "saving",
  },
  {
    id: "demo-2",
    type: "Opstalverzekering",
    verzekeraar: "Nationale-Nederlanden",
    premieMnd: 22.80,
    dekking: "Herbouwwaarde €320.000",
    eigenRisico: 250,
    ingangsdatum: "1 apr 2020",
    opzegdatum: "1 apr 2026",
    besteAlt: { naam: "a.s.r.", premieMnd: 9.50 },
    besparingJaar: 160,
    status: "action",
  },
  {
    id: "demo-3",
    type: "Aansprakelijkheidsverzekering",
    verzekeraar: "Centraal Beheer",
    premieMnd: 2.95,
    dekking: "Gezin — €2.500.000",
    eigenRisico: 0,
    ingangsdatum: "1 jan 2023",
    opzegdatum: "1 jan 2027",
    besteAlt: { naam: "Allianz Direct", premieMnd: 2.15 },
    besparingJaar: 10,
    status: "minor",
  },
  {
    id: "demo-4",
    type: "Reisverzekering",
    verzekeraar: "FBTO",
    premieMnd: 4.50,
    dekking: "Gezin — Wereld",
    eigenRisico: 50,
    ingangsdatum: "1 sep 2022",
    opzegdatum: "1 sep 2026",
    besteAlt: { naam: "Allianz Direct", premieMnd: 4.90 },
    besparingJaar: -5,
    status: "good",
  },
];

const TYPE_ICONS: Record<DemoPolis["type"], string> = {
  Inboedelverzekering: "🏠",
  Opstalverzekering: "🏗️",
  Aansprakelijkheidsverzekering: "🤝",
  Reisverzekering: "✈️",
};

const STATUS_CONFIG: Record<DemoPolis["status"], { label: string; color: string; border: string; bg: string }> = {
  saving: { label: "Betere optie gevonden", color: "text-bw-green", border: "border-bw-green", bg: "bg-bw-green-bg" },
  action: { label: "Actie nodig — opzegdatum nadert", color: "text-bw-orange", border: "border-bw-orange", bg: "bg-bw-orange-bg" },
  minor: { label: "Kleine besparing mogelijk", color: "text-bw-blue", border: "border-bw-blue", bg: "bg-bw-blue-light" },
  good: { label: "Je zit goed ✓", color: "text-bw-text-mid", border: "border-bw-border", bg: "bg-bw-bg" },
};

function daysUntil(dateStr: string): number {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mrt: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
  };
  const parts = dateStr.split(" ");
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  const target = new Date(year, month, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCountdown(days: number): string {
  if (days < 0) return "Verlopen";
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  if (days < 60) return `Over ${days} dagen`;
  const months = Math.floor(days / 30);
  return `Over ${months} maanden`;
}

// ── Server analysis type ──
interface ServerAnalysis {
  id: string;
  verzekeraar_huidig: string;
  product_type: string;
  dekking: string;
  premie_huidig: number;
  beste_alternatief: string;
  max_besparing: number;
  monitoring_active: boolean;
  created_at: string;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [polissen, setPolissen] = useState<SavedPolis[]>([]);
  const [serverAnalyses, setServerAnalyses] = useState<ServerAnalysis[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bw-polissen") || "[]");
    setPolissen(stored);

    if (session?.user) {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((data) => setServerAnalyses(data.analyses ?? []))
        .catch(() => {});
    }
  }, [session]);

  const deletePolis = (id: string) => {
    if (!confirm("Weet je zeker dat je deze analyse wilt verwijderen?")) return;
    const updated = polissen.filter((p) => p.id !== id);
    setPolissen(updated);
    localStorage.setItem("bw-polissen", JSON.stringify(updated));
  };

  const deleteServerAnalysis = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze analyse wilt verwijderen?")) return;
    await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    setServerAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  // Use demo data when there's no real data
  const hasRealData = polissen.length > 0 || serverAnalyses.length > 0;
  const demoPolissen = hasRealData ? [] : DEMO_POLISSEN;

  const totalBesparing = demoPolissen.reduce((s, p) => s + Math.max(0, p.besparingJaar), 0);
  const actieItems = demoPolissen.filter((p) => p.status === "action").length;
  const besparingItems = demoPolissen.filter((p) => p.besparingJaar > 0).length;

  // Timeline data sorted by date
  const timelineItems = [...demoPolissen].sort((a, b) => daysUntil(a.opzegdatum) - daysUntil(b.opzegdatum));

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12 pb-20">
      {/* Header — persoonlijk & advies-gevoel */}
      <div className="mb-10 animate-fadeUp">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-[52px] h-[52px] rounded-full bg-bw-green flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-heading font-bold">
                {session?.user?.email?.[0]?.toUpperCase() ?? "B"}
              </span>
            </div>
            <div>
              <h2 className="font-heading text-[26px] md:text-[30px] font-bold text-bw-deep leading-tight">
                Welkom terug
              </h2>
              <p className="text-[13px] text-bw-text-mid mt-0.5">
                {session?.user?.email ?? "Jouw persoonlijke verzekeringsoverzicht"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-bw-text-light border border-bw-border bg-white cursor-pointer font-[inherit] hover:bg-bw-bg hover:text-bw-text-mid transition-colors"
              >
                Uitloggen
              </button>
            )}
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-colors"
            >
              <UploadIcon className="w-4 h-4" /> Nieuwe polis
            </Link>
          </div>
        </div>
        {/* Advies-banner */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-bw-bg rounded-xl border border-bw-border">
          <div className="w-9 h-9 rounded-lg bg-bw-green-bg flex items-center justify-center shrink-0">
            <ShieldIcon className="w-[18px] h-[18px] text-bw-green" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-bw-deep">
              BespaarWacht houdt je polissen 24/7 in de gaten
            </div>
            <div className="text-[12px] text-bw-text-mid">
              We vergelijken dagelijks alle aanbieders en melden ons zodra we iets beters vinden. Jij hoeft niets te doen.
            </div>
          </div>
        </div>
      </div>

      {/* ── A. Summary Hero ── */}
      {demoPolissen.length > 0 && (
        <div className="bg-bw-deep rounded-2xl p-6 md:p-8 mb-8 text-white animate-fadeUp">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PulseDot />
                <span className="text-sm font-medium text-white/70">Live monitoring</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-heading font-bold mb-1">
                {demoPolissen.length} polissen worden bewaakt
              </h3>
              <p className="text-white/60 text-sm">BespaarWacht controleert dagelijks alle aanbieders voor jou.</p>
            </div>
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-heading font-bold text-[#4ADE80]">
                  € {totalBesparing}
                </div>
                <div className="text-xs text-white/50 mt-1">besparing/jaar mogelijk</div>
              </div>
              <div className="w-px bg-white/15" />
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-heading font-bold">
                  {besparingItems}
                </div>
                <div className="text-xs text-white/50 mt-1">betere opties gevonden</div>
              </div>
            </div>
          </div>
          {actieItems > 0 && (
            <div className="mt-5 px-4 py-2.5 bg-bw-orange/15 border border-bw-orange/30 rounded-lg inline-flex items-center gap-2">
              <span className="text-bw-orange text-sm">⚠</span>
              <span className="text-sm font-medium text-bw-orange">
                {actieItems} opzegdatum{actieItems > 1 ? "s" : ""} nader{actieItems > 1 ? "en" : "t"} — actie vereist
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── B. Tijdlijn Strip ── */}
      {demoPolissen.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-bw-border p-5 animate-fadeUp" style={{ animationDelay: "0.05s" }}>
          <h4 className="text-xs font-bold text-bw-text-mid uppercase tracking-wider mb-4">Opzegkalender</h4>
          <div className="relative">
            {/* Timeline bar */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-bw-border" />
            <div className="flex justify-between relative">
              {timelineItems.map((p, i) => {
                const days = daysUntil(p.opzegdatum);
                const isUrgent = days < 60;
                const isFirst = i === 0;
                return (
                  <div key={p.id} className="flex flex-col items-center text-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 border-2 ${
                        isUrgent
                          ? "bg-bw-orange-bg border-bw-orange"
                          : isFirst
                          ? "bg-bw-green-bg border-bw-green"
                          : "bg-white border-bw-border"
                      }`}
                    >
                      {TYPE_ICONS[p.type]}
                    </div>
                    <div className={`mt-2 text-[11px] font-bold ${isUrgent ? "text-bw-orange" : "text-bw-deep"}`}>
                      {p.opzegdatum}
                    </div>
                    <div className="text-[10px] text-bw-text-light mt-0.5">{formatCountdown(days)}</div>
                    <div className="text-[10px] text-bw-text-mid mt-0.5 hidden md:block">{p.type.replace("verzekering", "")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── C. Poliskaarten ── */}
      {demoPolissen.length > 0 && (
        <div className="flex flex-col gap-4 mb-8">
          {demoPolissen.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status];
            const days = daysUntil(p.opzegdatum);
            const jaarPremie = (p.premieMnd * 12).toFixed(0);
            const altJaarPremie = (p.besteAlt.premieMnd * 12).toFixed(0);

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border-2 ${cfg.border} overflow-hidden transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] animate-fadeUp`}
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="p-5 md:p-6">
                  {/* Top row: icon + type + status badge */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-bw-bg flex items-center justify-center text-2xl shrink-0">
                        {TYPE_ICONS[p.type]}
                      </div>
                      <div>
                        <div className="text-[15px] font-bold text-bw-deep">{p.verzekeraar}</div>
                        <div className="text-[13px] text-bw-text-mid">{p.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color} ${cfg.bg} flex items-center gap-1.5`}>
                        <PulseDot />
                        {cfg.label}
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 bg-bw-bg rounded-lg">
                      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Premie</div>
                      <div className="text-[15px] font-bold text-bw-deep">€ {p.premieMnd.toFixed(2)}<span className="text-[11px] font-normal text-bw-text-mid">/mnd</span></div>
                      <div className="text-[11px] text-bw-text-light">€ {jaarPremie}/jaar</div>
                    </div>
                    <div className="p-3 bg-bw-bg rounded-lg">
                      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Dekking</div>
                      <div className="text-[13px] font-semibold text-bw-deep leading-tight">{p.dekking}</div>
                    </div>
                    <div className="p-3 bg-bw-bg rounded-lg">
                      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Eigen risico</div>
                      <div className="text-[15px] font-bold text-bw-deep">€ {p.eigenRisico}</div>
                    </div>
                    <div className={`p-3 rounded-lg ${days < 60 ? "bg-bw-orange-bg" : "bg-bw-bg"}`}>
                      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Opzegdatum</div>
                      <div className={`text-[15px] font-bold ${days < 60 ? "text-bw-orange" : "text-bw-deep"}`}>{p.opzegdatum}</div>
                      <div className={`text-[11px] ${days < 60 ? "text-bw-orange font-semibold" : "text-bw-text-light"}`}>
                        {formatCountdown(days)}
                      </div>
                    </div>
                  </div>

                  {/* Ingangsdatum subtiel */}
                  <div className="text-[11px] text-bw-text-light mb-4">
                    Lopend sinds {p.ingangsdatum}
                  </div>

                  {/* Beste alternatief + CTA */}
                  <div className={`flex items-center justify-between gap-4 p-4 rounded-xl ${p.besparingJaar > 0 ? "bg-bw-green-bg" : "bg-bw-bg"} flex-wrap`}>
                    <div>
                      <div className="text-[11px] text-bw-text-light uppercase tracking-wider mb-1">
                        {p.besparingJaar > 0 ? "Beste alternatief gevonden" : "Marktcheck"}
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-bw-deep">{p.besteAlt.naam}</span>
                        <span className="text-[13px] text-bw-text-mid">€ {p.besteAlt.premieMnd.toFixed(2)}/mnd</span>
                        <span className="text-[13px] text-bw-text-light">(€ {altJaarPremie}/jr)</span>
                      </div>
                      {p.besparingJaar > 0 ? (
                        <div className="text-sm font-bold text-bw-green mt-1">
                          ↓ € {p.besparingJaar} besparing per jaar
                        </div>
                      ) : (
                        <div className="text-sm text-bw-text-mid mt-1">
                          Jouw premie is al scherp geprijsd
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.besparingJaar > 0 && (
                        <Link
                          href="/analyse/demo"
                          className={`px-4 py-2.5 rounded-lg text-sm font-semibold no-underline transition-colors inline-flex items-center gap-1.5 ${
                            p.status === "action"
                              ? "bg-bw-orange text-white hover:bg-[#C2410C]"
                              : "bg-bw-green text-white hover:bg-bw-green-strong"
                          }`}
                        >
                          {p.status === "action" ? "Actie ondernemen" : "Bekijk alternatief"} <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        onClick={() => deletePolis(p.id)}
                        className="p-2.5 rounded-lg bg-transparent text-bw-text-light border border-bw-border cursor-pointer flex items-center hover:bg-bw-bg hover:text-bw-red transition-colors"
                        title="Verwijderen"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Real saved polissen (existing logic) ── */}
      {hasRealData && (
        <div className="flex flex-col gap-3 mb-8">
          {[
            ...serverAnalyses.map((a) => ({
              id: a.id,
              verzekeraar: a.verzekeraar_huidig,
              type: a.product_type,
              dekking: a.dekking ?? "",
              maandpremie: Number(a.premie_huidig),
              maxBesparing: Number(a.max_besparing),
              monitoringActive: a.monitoring_active,
              isServer: true as const,
            })),
            ...polissen.map((p) => ({
              id: p.id,
              verzekeraar: p.verzekeraar,
              type: p.type,
              dekking: p.dekking,
              maandpremie: p.maandpremie,
              maxBesparing: p.maxBesparing,
              monitoringActive: p.monitoringActive,
              isServer: false as const,
            })),
          ].map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-[14px] border border-bw-border px-6 py-5 flex items-center justify-between gap-4 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex-wrap"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bw-green-bg flex items-center justify-center shrink-0">
                  <ShieldIcon className="w-5 h-5 text-bw-green" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-bw-deep">{p.verzekeraar} — {p.type}</div>
                  <div className="text-[13px] text-bw-text-mid">{p.dekking}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-bw-red font-semibold">€ {p.maandpremie}/mnd</span>
                    <span className="text-xs text-bw-green font-bold bg-bw-green-bg px-1.5 py-0.5 rounded">↓ Tot € {p.maxBesparing}/jr besparing</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.monitoringActive && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-bw-green-bg">
                    <PulseDot />
                    <span className="text-[11px] font-semibold text-bw-green">Monitoring actief</span>
                  </div>
                )}
                <Link
                  href="/analyse/demo"
                  className="px-3.5 py-2 rounded-md text-xs font-semibold bg-bw-deep text-white no-underline hover:bg-bw-navy transition-colors inline-flex items-center gap-1"
                >
                  Bekijk <ArrowRightIcon className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => p.isServer ? deleteServerAnalysis(p.id) : deletePolis(p.id)}
                  className="p-2 rounded-md bg-transparent text-bw-red border border-[#FECACA] cursor-pointer flex items-center hover:bg-bw-red-bg transition-colors"
                  title="Verwijderen"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state (no demo, no real data — shouldn't happen but safe) ── */}
      {!hasRealData && demoPolissen.length === 0 && (
        <div className="text-center py-16 px-6 bg-white rounded-2xl border border-bw-border">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-bw-deep mb-2">Nog geen polissen opgeslagen</h3>
          <p className="text-sm text-bw-text-mid mb-6">Upload je eerste polis en sla de analyse op om 24/7 monitoring te activeren.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-[10px] text-[15px] font-semibold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-colors"
          >
            <UploadIcon className="w-4 h-4" /> Start nu <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── AVG Privacy Panel (ongewijzigd) ── */}
      <div className="mt-8 bg-white rounded-[14px] border border-bw-border overflow-hidden">
        <div className="px-5 py-4 bg-bw-deep flex items-center gap-2">
          <LockIcon className="w-3.5 h-3.5 text-white" />
          <span className="text-sm font-bold text-white">Jouw privacy — AVG-compliant</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3.5 bg-bw-green-bg rounded-[10px] border-l-[3px] border-bw-green">
              <div className="text-xs font-bold text-bw-green-strong mb-1.5">WAT WIJ WEL OPSLAAN</div>
              <div className="text-xs text-bw-green-dark leading-relaxed">
                Alleen geanonimiseerde verzekeringsdata: type verzekering, dekking, premie, woningtype, regio (postcode 4 cijfers). Deze data is niet herleidbaar tot jou als persoon.
              </div>
            </div>
            <div className="p-3.5 bg-bw-red-bg rounded-[10px] border-l-[3px] border-bw-red">
              <div className="text-xs font-bold text-bw-red mb-1.5">WAT WIJ NOOIT OPSLAAN</div>
              <div className="text-xs text-[#991B1B] leading-relaxed">
                Je naam, adres, geboortedatum, polisnummer, IBAN, BSN of andere direct identificeerbare persoonsgegevens. Je PDF wordt na analyse direct verwijderd.
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-bw-bg rounded-[10px] mb-3">
            <div className="text-xs font-bold text-bw-deep mb-2">Jouw AVG-rechten bij BespaarWacht</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {[
                ["Recht op inzage", "Bekijk altijd welke data wij bewaren"],
                ["Recht op verwijdering", "Verwijder je data met één klik"],
                ["Recht op overdracht", "Download je data als bestand"],
                ["Recht op bezwaar", "Bezwaar maken kan altijd"],
                ["Geen verkoop", "Wij verkopen nooit je gegevens"],
                ["Geen marketing", "Geen spam, alleen relevante alerts"],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-1.5 py-1">
                  <span className="text-bw-green shrink-0 mt-0.5"><CheckIcon className="w-3 h-3" /></span>
                  <div>
                    <span className="text-[11px] font-semibold text-bw-deep">{title}: </span>
                    <span className="text-[11px] text-bw-text-mid">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-bw-text-light leading-relaxed">
            BespaarWacht verwerkt gegevens conform de AVG (Algemene Verordening Gegevensbescherming). Grondslag: uitvoering overeenkomst (art. 6 lid 1b AVG) en gerechtvaardigd belang (art. 6 lid 1f AVG). Dataminimalisatie is ons uitgangspunt — wij verzamelen alleen wat strikt noodzakelijk is.
          </div>
        </div>
      </div>
    </div>
  );
}
