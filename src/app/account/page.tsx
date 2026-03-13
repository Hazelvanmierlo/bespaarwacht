"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  UploadIcon, ShieldIcon, ShieldDownIcon, ArrowRightIcon, CheckIcon,
  LockIcon, TrashIcon, PulseDot, Home, Building2, ShieldCheck, Plane,
  Car, HeartPulse, Zap, FileText, Settings, ChevronDown,
} from "@/components/icons";
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
  einddatum: string | null;
  polisnummer: string | null;
  verzekeraar_telefoon: string | null;
  verzekeraar_website: string | null;
  alert_gevonden: boolean;
  alert_alternatief: string | null;
  alert_besparing: number | null;
  alert_datum: string | null;
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
  inboedel: <Home className="w-5 h-5" />,
  opstal: <Building2 className="w-5 h-5" />,
  aansprakelijkheid: <ShieldCheck className="w-5 h-5" />,
  reis: <Plane className="w-5 h-5" />,
  auto: <Car className="w-5 h-5" />,
  zorg: <HeartPulse className="w-5 h-5" />,
  energie: <Zap className="w-5 h-5" />,
};

const PRODUCT_LABELS: Record<string, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
  auto: "Autoverzekering",
  zorg: "Zorgverzekering",
  energie: "Energiecontract",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aangevraagd: { label: "In behandeling", color: "text-bw-orange-strong", bg: "bg-bw-orange-bg" },
  bevestigd: { label: "Bevestigd", color: "text-bw-blue", bg: "bg-bw-blue-light" },
  afgerond: { label: "Afgerond", color: "text-bw-green-strong", bg: "bg-bw-green-bg" },
  geannuleerd: { label: "Geannuleerd", color: "text-bw-text-light", bg: "bg-bw-bg" },
};

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "14155238886";
const WA_JOIN = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_CODE || "";
const WA_TEXT = WA_JOIN || "Hoi";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [analyses, setAnalyses] = useState<ServerAnalysis[]>([]);
  const [energieLeads, setEnergieLeads] = useState<EnergieLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze polis wilt verwijderen?")) return;
    await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  // Split insurance vs energy analyses
  const insuranceAnalyses = analyses.filter((a) => a.product_type !== "energie");
  const energieAnalyses = analyses.filter((a) => a.product_type === "energie");

  const totalBesparing = analyses.reduce((s, a) => {
    const alert = Number(a.alert_besparing) || 0;
    const initial = Number(a.max_besparing) || 0;
    return s + Math.max(alert, initial, 0);
  }, 0);
  const alertCount = analyses.filter((a) => a.alert_gevonden || Number(a.max_besparing) > 0).length;
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
              href="/upload"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[12px] sm:text-[13px] font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors"
            >
              <UploadIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Polis toevoegen</span><span className="sm:hidden">Toevoegen</span>
            </Link>
            <Link
              href="/account/profiel"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
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

        {/* ── Welcome + stats ── */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 rounded-full bg-bw-green flex items-center justify-center shrink-0">
              <span className="text-white text-lg font-heading font-bold">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "B"}
              </span>
            </div>
            <div>
              <h1 className="font-heading text-[22px] sm:text-[24px] font-bold text-bw-deep leading-tight">
                Hoi{session?.user?.name ? ` ${session.user.name.split(" ")[0]}` : ""}, wij bewaken je polissen 24/7
              </h1>
              <p className="text-[12px] sm:text-[13px] text-bw-text-mid">
                We vergelijken dagelijks alle aanbieders en melden ons zodra we iets beters vinden.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-bw-border p-3 sm:p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Polissen bewaakt</p>
              <div className="flex items-center gap-2">
                <p className="text-xl sm:text-2xl font-bold text-bw-deep">{analyses.length}</p>
                {monitoringActief > 0 && <PulseDot />}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-3 sm:p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Mogelijke besparing</p>
              <p className="text-xl sm:text-2xl font-bold text-bw-green-strong">&euro;{Math.round(totalBesparing)}</p>
              <p className="text-[10px] text-bw-text-light">/jaar</p>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-3 sm:p-4">
              <p className="text-[10px] text-bw-text-light uppercase tracking-wider mb-1">Alerts</p>
              <p className={`text-xl sm:text-2xl font-bold ${alertCount > 0 ? "text-bw-orange" : "text-bw-deep"}`}>{alertCount}</p>
              <p className="text-[10px] text-bw-text-light">{alertCount > 0 ? "goedkoper gevonden" : "alles scherp"}</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTIE: MIJN VERZEKERINGEN ── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-[18px] font-bold text-bw-deep">Mijn verzekeringen</h2>
            <Link
              href="/upload?type=verzekering"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-bw-blue no-underline hover:underline"
            >
              + Polis toevoegen
            </Link>
          </div>

          {insuranceAnalyses.length === 0 ? (
            <EmptyState
              icon={<ShieldIcon className="w-8 h-8 text-bw-text-light" />}
              title="Nog geen verzekeringen"
              description="Upload je eerste polis en wij bewaken de markt voor je."
              ctaHref="/upload?type=verzekering"
              ctaLabel="Upload polis"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {insuranceAnalyses.map((a) => (
                <PolicyCard
                  key={a.id}
                  analysis={a}
                  expandedContact={expandedContact}
                  onToggleContact={setExpandedContact}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTIE: MIJN ENERGIE ── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-[18px] font-bold text-bw-deep">Mijn energie</h2>
            <Link
              href="/upload?type=energie"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-bw-green no-underline hover:underline"
            >
              + Energie vergelijken
            </Link>
          </div>

          {energieAnalyses.length === 0 && energieLeads.length === 0 ? (
            <EmptyState
              icon={<Zap className="w-8 h-8 text-bw-green/40" />}
              title="Nog geen energiecontract"
              description="Upload je jaaroverzicht of energierekening. Wij bewaken de tarieven zodat je altijd het scherpste contract hebt."
              ctaHref="/upload?type=energie"
              ctaLabel="Energie vergelijken"
              ctaColor="green"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {energieAnalyses.map((a) => (
                <PolicyCard
                  key={a.id}
                  analysis={a}
                  expandedContact={expandedContact}
                  onToggleContact={setExpandedContact}
                  onDelete={handleDelete}
                />
              ))}
              {/* Energie leads (overstappen in progress) */}
              {energieLeads.map((lead) => {
                const s = STATUS_MAP[lead.status] || STATUS_MAP.aangevraagd;
                return (
                  <div key={lead.id} className="bg-white rounded-xl border border-bw-border p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-bw-green-bg flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-bw-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-bw-deep">
                            {lead.leverancier_huidig} &rarr; {lead.leverancier_nieuw}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.color} ${s.bg}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="text-[12px] text-bw-text-mid">
                          Overstap aangevraagd op {new Date(lead.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[16px] font-bold text-bw-green">&minus;&euro;{Math.round(Number(lead.besparing_jaar1))}</div>
                        <div className="text-[10px] text-bw-text-light">/jaar</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SECTIE: WHATSAPP KOPPELING ── */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className="mb-8">
          <div className="bg-[#F0FDF4] rounded-2xl border border-[#BBF7D0] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-bw-deep mb-1">Ontvang alerts via WhatsApp</div>
              <div className="text-[13px] text-bw-text-mid">
                We sturen je een bericht zodra we een goedkopere verzekering of energieleverancier vinden voor jou.
              </div>
            </div>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-[#25D366] text-white no-underline hover:bg-[#128C7E] transition-colors shrink-0"
            >
              Start op WhatsApp <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* ── Privacy footer ── */}
        <div className="bg-white rounded-xl border border-bw-border p-4 sm:p-5">
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

/* ═══════════════════════════════════════════════════════════════════════ */
/* ── Policy Card Component ──                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

function PolicyCard({
  analysis: a,
  expandedContact,
  onToggleContact,
  onDelete,
}: {
  analysis: ServerAnalysis;
  expandedContact: string | null;
  onToggleContact: (id: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const besparing = Number(a.alert_besparing) || Number(a.max_besparing) || 0;
  const hasAlert = a.alert_gevonden || besparing > 0;
  const alternatief = a.alert_alternatief || a.beste_alternatief;
  const icon = PRODUCT_ICONS[a.product_type] || <FileText className="w-5 h-5" />;
  const label = PRODUCT_LABELS[a.product_type] || a.product_type;
  const isContactOpen = expandedContact === a.id;
  const isEnergie = a.product_type === "energie";

  // Einddatum warning: < 3 months away
  const einddatumWarning = a.einddatum ? (() => {
    const end = new Date(a.einddatum);
    const now = new Date();
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 90;
  })() : false;

  return (
    <div
      className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
        hasAlert
          ? "border-bw-orange shadow-[0_2px_12px_rgba(249,115,22,0.08)]"
          : einddatumWarning
            ? "border-[#FACC15] shadow-[0_2px_12px_rgba(250,204,21,0.08)]"
            : "border-bw-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* ── Row 1: Type + Status ── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isEnergie ? "bg-bw-green-bg text-bw-green" : "bg-bw-bg text-bw-deep"
            }`}>
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] sm:text-[15px] font-bold text-bw-deep truncate">{a.verzekeraar_huidig}</div>
              <div className="text-[12px] text-bw-text-mid">{label}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {a.monitoring_active && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bw-green-bg">
                <PulseDot />
                <span className="text-[10px] font-semibold text-bw-green-strong hidden sm:inline">24/7</span>
              </div>
            )}
            {hasAlert ? (
              <div className="px-2.5 py-1 rounded-full bg-bw-orange-bg text-[11px] font-bold text-bw-orange-strong">
                Goedkoper gevonden!
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-full bg-bw-green-bg text-[11px] font-bold text-bw-green-strong">
                Je zit goed
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Key details ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <DetailCell label="Premie" value={`€${Number(a.premie_huidig).toFixed(2)}/mnd`} />
          <DetailCell label="Dekking" value={a.dekking || "—"} />
          <DetailCell
            label="Einddatum"
            value={a.einddatum
              ? new Date(a.einddatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
              : "Niet ingesteld"
            }
            warn={einddatumWarning}
          />
          <DetailCell
            label="Opgeslagen"
            value={new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
          />
        </div>

        {/* ── Einddatum warning ── */}
        {einddatumWarning && a.einddatum && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-[#FEF9C3] border border-[#FDE68A]">
            <svg className="w-4 h-4 text-[#CA8A04] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span className="text-[12px] font-semibold text-[#854D0E]">
              Let op: je kunt opzeggen voor {new Date(a.einddatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <Link href="/account/opzeggen" className="ml-auto text-[11px] font-bold text-[#CA8A04] no-underline hover:underline shrink-0">
              Opzegbrief maken
            </Link>
          </div>
        )}

        {/* ── Alert: goedkoper gevonden ── */}
        {hasAlert && alternatief && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 mb-3 rounded-xl bg-bw-green-bg border border-[#BBF7D0] flex-wrap">
            <div>
              <div className="text-[11px] text-bw-green-strong uppercase tracking-wider font-bold mb-0.5">
                Besparing gevonden
              </div>
              <div className="text-[14px] font-bold text-bw-deep">
                {alternatief} biedt dezelfde dekking voor <span className="text-bw-green">&euro;{(Number(a.premie_huidig) - besparing / 12).toFixed(2)}/mnd</span>
              </div>
              <div className="text-[12px] text-bw-green-strong font-semibold">
                Bespaar &euro;{Math.round(besparing)} per jaar
              </div>
            </div>
            <Link
              href={`/analyse/${a.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors shrink-0"
            >
              Bekijk alternatief <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── No alert: all good ── */}
        {!hasAlert && (
          <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-bw-bg">
            <CheckIcon className="w-3.5 h-3.5 text-bw-green shrink-0" />
            <span className="text-[12px] text-bw-text-mid">
              Jouw premie is scherp geprijsd. We blijven dagelijks vergelijken.
            </span>
          </div>
        )}

        {/* ── Actions row ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleContact(isContactOpen ? null : a.id)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-bw-text-mid bg-transparent border-none cursor-pointer font-[inherit] hover:text-bw-deep transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isContactOpen ? "rotate-180" : ""}`} />
            Vragen of schade?
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onDelete(a.id)}
            className="p-2 rounded-lg bg-transparent text-bw-text-light border-none cursor-pointer hover:text-bw-red transition-colors"
            title="Verwijderen"
          >
            <TrashIcon />
          </button>
        </div>

        {/* ── Contact info (expandable) ── */}
        {isContactOpen && (
          <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
            <div className="text-[12px] text-bw-text-mid mb-2">
              Heb je een vraag of schade? Neem direct contact op met je verzekeraar:
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {a.verzekeraar_telefoon && (
                <a href={`tel:${a.verzekeraar_telefoon.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bw-bg text-[13px] font-semibold text-bw-deep no-underline hover:bg-bw-blue-light transition-colors">
                  <svg className="w-4 h-4 text-bw-blue shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                  {a.verzekeraar_telefoon}
                </a>
              )}
              {a.verzekeraar_website && (
                <a href={a.verzekeraar_website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bw-bg text-[13px] font-semibold text-bw-blue no-underline hover:bg-bw-blue-light transition-colors">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                  Website
                </a>
              )}
              {!a.verzekeraar_telefoon && !a.verzekeraar_website && (
                <span className="text-[12px] text-bw-text-light">Contactgegevens niet beschikbaar — zoek op de website van {a.verzekeraar_huidig}.</span>
              )}
            </div>
            <Link href="/account/opzeggen" className="inline-flex items-center gap-1 mt-3 text-[11px] font-semibold text-bw-blue no-underline hover:underline">
              <FileText className="w-3 h-3" /> Opzegbrief maken
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detail Cell ── */
function DetailCell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg ${warn ? "bg-[#FEF9C3]" : "bg-bw-bg"}`}>
      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[13px] font-semibold leading-tight ${warn ? "text-[#854D0E]" : "text-bw-deep"}`}>{value}</div>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ icon, title, description, ctaHref, ctaLabel, ctaColor = "orange" }: {
  icon: ReactNode;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  ctaColor?: "orange" | "green";
}) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-xl border border-bw-border">
      <div className="mb-3 flex justify-center">{icon}</div>
      <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">{title}</h3>
      <p className="text-[13px] text-bw-text-mid mb-5 max-w-md mx-auto">{description}</p>
      <Link
        href={ctaHref}
        className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white no-underline transition-colors ${
          ctaColor === "green" ? "bg-bw-green hover:bg-bw-green/90" : "bg-bw-orange hover:bg-bw-orange-strong"
        }`}
      >
        {ctaLabel} <ArrowRightIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
