"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { UploadIcon, ShieldIcon, ShieldDownIcon, ArrowRightIcon, CheckIcon, LockIcon, TrashIcon, PulseDot, Home, Building2, ShieldCheck, Plane, Car, HeartPulse, Zap, ClipboardList, RefreshCw, FileText, Settings } from "@/components/icons";
import type { ReactNode } from "react";

// ── Types ──
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

interface EnergieLead {
  id: string;
  leverancier_huidig: string;
  leverancier_nieuw: string;
  kosten_huidig_jaar: number;
  kosten_nieuw_jaar: number;
  besparing_jaar1: number;
  status: string;
  created_at: string;
}

const PRODUCT_ICONS: Record<string, ReactNode> = {
  inboedel: <Home className="w-6 h-6" />,
  opstal: <Building2 className="w-6 h-6" />,
  aansprakelijkheid: <ShieldCheck className="w-6 h-6" />,
  reis: <Plane className="w-6 h-6" />,
  auto: <Car className="w-6 h-6" />,
  zorg: <HeartPulse className="w-6 h-6" />,
};

const PRODUCT_LABELS: Record<string, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
  auto: "Autoverzekering",
  zorg: "Zorgverzekering",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aangevraagd: { label: "In behandeling", color: "text-bw-orange-strong", bg: "bg-bw-orange-bg" },
  bevestigd: { label: "Bevestigd", color: "text-bw-blue", bg: "bg-bw-blue-light" },
  afgerond: { label: "Afgerond", color: "text-bw-green-strong", bg: "bg-bw-green-bg" },
  geannuleerd: { label: "Geannuleerd", color: "text-bw-text-light", bg: "bg-bw-bg" },
};

type Tab = "overzicht" | "energie" | "overstappen";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [analyses, setAnalyses] = useState<ServerAnalysis[]>([]);
  const [energieLeads, setEnergieLeads] = useState<EnergieLead[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
    if (session?.user) {
      Promise.all([
        fetch("/api/analyses").then((r) => r.json()).then((d) => setAnalyses(d.analyses ?? [])),
        fetch("/api/account/leads").then((r) => r.json()).then((d) => setEnergieLeads(d.leads ?? [])),
      ])
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, status]);

  const deleteAnalysis = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze analyse wilt verwijderen?")) return;
    await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const totalBesparing = analyses.reduce((s, a) => s + Math.max(0, Number(a.max_besparing) || 0), 0);
  const besparingItems = analyses.filter((a) => Number(a.max_besparing) > 0).length;
  const monitoringActief = analyses.filter((a) => a.monitoring_active).length;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-bw-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-bw-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bw-bg">
      {/* ── Portal top bar ── */}
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
              href="/upload"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors"
            >
              <UploadIcon className="w-3.5 h-3.5" /> Nieuwe polis
            </Link>
            <Link
              href="/upload?type=energie"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-bw-green text-white no-underline hover:bg-bw-green/90 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Energie
            </Link>
            <Link
              href="/account/opzeggen"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Opzeggen
            </Link>
            <Link
              href="/account/profiel"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> Instellingen
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
        {/* ── Welcome + stats ── */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-bw-green flex items-center justify-center shrink-0">
              <span className="text-white text-lg font-heading font-bold">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "B"}
              </span>
            </div>
            <div>
              <h1 className="font-heading text-[24px] font-bold text-bw-deep leading-tight">
                Welkom{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : " terug"}
              </h1>
              <p className="text-[13px] text-bw-text-mid">{session?.user?.email}</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Polissen bewaakt</p>
              <p className="text-2xl font-bold text-bw-deep">{analyses.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Mogelijke besparing</p>
              <p className="text-2xl font-bold text-bw-green-strong">€{totalBesparing}</p>
              <p className="text-[10px] text-bw-text-light">/jaar</p>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Betere deals</p>
              <p className="text-2xl font-bold text-bw-orange">{besparingItems}</p>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Monitoring actief</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-bw-deep">{monitoringActief}</p>
                {monitoringActief > 0 && <PulseDot />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex gap-1 mb-6 border-b border-bw-border">
          {([
            { key: "overzicht" as Tab, label: "Mijn polissen", icon: <ClipboardList className="w-4 h-4" /> },
            { key: "energie" as Tab, label: "Energie", icon: <Zap className="w-4 h-4" /> },
            { key: "overstappen" as Tab, label: "Overstappen", icon: <RefreshCw className="w-4 h-4" /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px cursor-pointer bg-transparent font-[inherit] transition-colors ${
                activeTab === tab.key
                  ? "border-bw-blue text-bw-blue"
                  : "border-transparent text-bw-text-mid hover:text-bw-deep"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Mijn polissen ── */}
        {activeTab === "overzicht" && (
          <div>
            {/* Monitoring banner */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-bw-bg rounded-xl border border-bw-border mb-6">
              <div className="w-9 h-9 rounded-lg bg-bw-green-bg flex items-center justify-center shrink-0">
                <ShieldIcon className="w-[18px] h-[18px] text-bw-green" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-bw-deep">
                  DeVerzekeringsAgent houdt je polissen 24/7 in de gaten
                </div>
                <div className="text-[12px] text-bw-text-mid">
                  We vergelijken dagelijks alle aanbieders en melden ons zodra we iets beters vinden.
                </div>
              </div>
            </div>

            {analyses.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-2xl border border-bw-border">
                <div className="mb-4 flex justify-center"><ClipboardList className="w-10 h-10 text-bw-text-light" /></div>
                <h3 className="text-lg font-bold text-bw-deep mb-2">Nog geen polissen opgeslagen</h3>
                <p className="text-sm text-bw-text-mid mb-6 max-w-md mx-auto">
                  Upload je eerste polis of energierekening. Wij vergelijken alle aanbieders en bewaken de markt zodat jij nooit meer te veel betaalt.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/upload?type=verzekering"
                    className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors"
                  >
                    <UploadIcon className="w-4 h-4" /> Upload polis
                  </Link>
                  <Link
                    href="/upload?type=energie"
                    className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-bold bg-bw-green text-white no-underline hover:bg-bw-green/90 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" /> Energie vergelijken
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {analyses.map((a) => {
                  const besparing = Number(a.max_besparing) || 0;
                  const hasBesparing = besparing > 0;
                  const icon = PRODUCT_ICONS[a.product_type] || <FileText className="w-6 h-6" />;
                  const label = PRODUCT_LABELS[a.product_type] || a.product_type;

                  return (
                    <div
                      key={a.id}
                      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
                        hasBesparing ? "border-bw-green" : "border-bw-border"
                      }`}
                    >
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-bw-bg flex items-center justify-center shrink-0">
                              {icon}
                            </div>
                            <div>
                              <div className="text-[15px] font-bold text-bw-deep">{a.verzekeraar_huidig}</div>
                              <div className="text-[13px] text-bw-text-mid">{label}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.monitoring_active && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bw-green-bg">
                                <PulseDot />
                                <span className="text-[11px] font-semibold text-bw-green-strong">Live</span>
                              </div>
                            )}
                            {hasBesparing && (
                              <div className="px-2.5 py-1 rounded-full bg-bw-orange-bg text-[11px] font-semibold text-bw-orange-strong">
                                Betere optie gevonden
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="p-3 bg-bw-bg rounded-lg">
                            <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Premie</div>
                            <div className="text-[15px] font-bold text-bw-deep">
                              €{Number(a.premie_huidig).toFixed(2)}
                              <span className="text-[11px] font-normal text-bw-text-mid">/mnd</span>
                            </div>
                          </div>
                          <div className="p-3 bg-bw-bg rounded-lg">
                            <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Dekking</div>
                            <div className="text-[13px] font-semibold text-bw-deep leading-tight">{a.dekking || "—"}</div>
                          </div>
                          <div className="p-3 bg-bw-bg rounded-lg">
                            <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Type</div>
                            <div className="text-[13px] font-semibold text-bw-deep">{label}</div>
                          </div>
                          <div className="p-3 bg-bw-bg rounded-lg">
                            <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Opgeslagen op</div>
                            <div className="text-[13px] font-semibold text-bw-deep">
                              {new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>

                        {/* Best alternative */}
                        <div className={`flex items-center justify-between gap-4 p-4 rounded-xl flex-wrap ${hasBesparing ? "bg-bw-green-bg" : "bg-bw-bg"}`}>
                          <div>
                            <div className="text-[11px] text-bw-text-light uppercase tracking-wider mb-1">
                              {hasBesparing ? "Beste alternatief gevonden" : "Marktcheck"}
                            </div>
                            {a.beste_alternatief ? (
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-[15px] font-bold text-bw-deep">{a.beste_alternatief}</span>
                                {hasBesparing && (
                                  <span className="text-sm font-bold text-bw-green">
                                    ↓ €{besparing.toFixed(0)} besparing per jaar
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-bw-text-mid">Jouw premie is al scherp geprijsd</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/analyse/${a.id}`}
                              className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline transition-colors inline-flex items-center gap-1.5 bg-bw-orange text-white hover:bg-bw-orange-strong"
                            >
                              Bekijk details <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => deleteAnalysis(a.id)}
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
          </div>
        )}

        {/* ── Tab: Energie ── */}
        {activeTab === "energie" && (
          <div>
            <div className="text-center py-16 px-6 bg-white rounded-2xl border border-bw-border">
              <div className="mb-4 flex justify-center"><Zap className="w-10 h-10 text-bw-green" /></div>
              <h3 className="text-lg font-bold text-bw-deep mb-2">Energievergelijking</h3>
              <p className="text-sm text-bw-text-mid mb-6 max-w-md mx-auto">
                Upload je jaaroverzicht of energierekening en wij vergelijken 18 leveranciers. We bewaken de tarieven zodat je altijd het scherpste contract hebt.
              </p>
              <Link
                href="/upload?type=energie"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-bold bg-bw-green text-white no-underline hover:bg-bw-green/90 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Energie vergelijken <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Tab: Overstappen ── */}
        {activeTab === "overstappen" && (
          <div>
            {energieLeads.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-2xl border border-bw-border">
                <div className="mb-4 flex justify-center"><RefreshCw className="w-10 h-10 text-bw-text-light" /></div>
                <h3 className="text-lg font-bold text-bw-deep mb-2">Geen overstappen</h3>
                <p className="text-sm text-bw-text-mid mb-6 max-w-md mx-auto">
                  Als je via ons overstapt naar een betere deal, zie je hier de voortgang.
                  Wij regelen alles — van opzeggen tot activeren.
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors"
                >
                  Start vergelijking <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {energieLeads.map((lead) => {
                  const s = STATUS_MAP[lead.status] || STATUS_MAP.aangevraagd;
                  return (
                    <div key={lead.id} className="bg-white rounded-xl border border-bw-border p-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-bw-deep">
                              {lead.leverancier_huidig} → {lead.leverancier_nieuw}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.color} ${s.bg}`}>
                              {s.label}
                            </span>
                          </div>
                          <div className="text-[12px] text-bw-text-mid">
                            Besparing: <span className="font-semibold text-bw-green">€{Number(lead.besparing_jaar1).toFixed(0)}/jaar</span>
                          </div>
                        </div>
                        <div className="text-[12px] text-bw-text-light">
                          {new Date(lead.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Privacy footer ── */}
        <div className="mt-10 bg-white rounded-xl border border-bw-border p-5">
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
  );
}
