import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { auth } from "@/auth";
import { getAlternatives } from "@/lib/queries";
import {
  CheckIcon, ArrowRightIcon, Home, Building2, ShieldCheck, Plane,
  FileText, Search, Zap, Car, HeartPulse, RefreshCw, ShieldIcon,
} from "@/components/icons";
import type { ReactNode } from "react";

const PRODUCT_LABELS: Record<string, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
  auto: "Autoverzekering",
  zorg: "Zorgverzekering",
  energie: "Energiecontract",
};

const PRODUCT_ICONS: Record<string, ReactNode> = {
  inboedel: <Home className="w-6 h-6 text-bw-blue" />,
  opstal: <Building2 className="w-6 h-6 text-bw-blue" />,
  aansprakelijkheid: <ShieldCheck className="w-6 h-6 text-bw-blue" />,
  reis: <Plane className="w-6 h-6 text-bw-blue" />,
  auto: <Car className="w-6 h-6 text-bw-blue" />,
  zorg: <HeartPulse className="w-6 h-6 text-bw-blue" />,
  energie: <Zap className="w-6 h-6 text-bw-green" />,
};

export default async function AnalysePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const { id } = await params;
  const { product } = await searchParams;

  // Demo page redirect
  if (id === "demo") {
    const productParam = product ? `?product=${product}` : "";
    redirect(`/analyse/demo${productParam}`);
  }

  // Check auth
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch analysis from Supabase
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <NotFound message="Database niet beschikbaar." />;
  }

  const { data: analysis } = await supabase
    .from("saved_analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!analysis) {
    return <NotFound message="Analyse niet gevonden of je hebt geen toegang." />;
  }

  // Fetch current market alternatives for this product type
  const alternatives = await getAlternatives(analysis.product_type);

  // Find the recommended alternative
  const alertAlt = analysis.alert_alternatief || analysis.beste_alternatief;
  const matchedAlt = alternatives.find(
    (a) => a.naam.toLowerCase() === alertAlt?.toLowerCase()
  );
  // Also get top 3 alternatives sorted by price
  const topAlternatives = alternatives
    .filter((a) => a.naam.toLowerCase() !== analysis.verzekeraar_huidig.toLowerCase())
    .sort((a, b) => a.premie - b.premie)
    .slice(0, 3);

  const besparingJaar = Number(analysis.alert_besparing) || 0;
  const besparingMaand = besparingJaar > 0 ? besparingJaar / 12 : Number(analysis.max_besparing) || 0;
  const hasAlert = analysis.alert_gevonden || besparingMaand > 0;
  const productLabel = PRODUCT_LABELS[analysis.product_type] || analysis.product_type;
  const icon = PRODUCT_ICONS[analysis.product_type] || <FileText className="w-6 h-6 text-bw-blue" />;
  const isEnergie = analysis.product_type === "energie";

  return (
    <div className="max-w-[780px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Back link */}
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-bw-text-mid hover:text-bw-blue transition-colors mb-6 no-underline"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Terug naar mijn dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h1 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep">{analysis.verzekeraar_huidig}</h1>
          <p className="text-[13px] text-bw-text-mid">{productLabel} &middot; {analysis.dekking}</p>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {hasAlert && matchedAlt && (
        <div className="bg-gradient-to-r from-bw-green-bg to-[#DCFCE7] border-2 border-[#BBF7D0] rounded-2xl p-5 sm:p-6 mb-6">
          <div className="text-[11px] text-bw-green-strong uppercase tracking-wider font-bold mb-2">
            Goedkoper alternatief gevonden
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-[20px] sm:text-[24px] font-bold text-bw-deep mb-1">
                {matchedAlt.naam}
              </div>
              <div className="text-[14px] text-bw-text-mid">
                <span className="text-bw-green-strong font-bold">&euro;{matchedAlt.premie.toFixed(2)}/mnd</span>
                {" "}in plaats van &euro;{Number(analysis.premie_huidig).toFixed(2)}/mnd
              </div>
              <div className="text-[15px] font-bold text-bw-green-strong mt-1">
                Bespaar &euro;{besparingMaand.toFixed(2)}/mnd (&euro;{Math.round(besparingMaand * 12)}/jaar)
              </div>
            </div>
            {matchedAlt.url && (
              <a
                href={matchedAlt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold bg-bw-orange text-white no-underline hover:bg-bw-orange-strong transition-colors shadow-sm shrink-0"
              >
                Overstappen <ArrowRightIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── No alert: scherp geprijsd ── */}
      {!hasAlert && (
        <div className="bg-bw-green-bg border border-[#BBF7D0] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bw-green flex items-center justify-center shrink-0">
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-bw-deep">Jouw premie is scherp geprijsd</div>
              <div className="text-[13px] text-bw-text-mid">
                We vergelijken dagelijks alle {isEnergie ? "leveranciers" : "aanbieders"} en melden het zodra er een betere optie is.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Current policy details ── */}
      <div className="bg-white rounded-2xl border border-bw-border overflow-hidden mb-4">
        <div className="px-5 py-3 bg-bw-bg border-b border-bw-border flex items-center justify-between">
          <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Je huidige {isEnergie ? "contract" : "verzekering"}</span>
          {analysis.monitoring_active && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-bw-blue">
              <span className="w-2 h-2 rounded-full bg-bw-blue animate-pulse" />
              24/7 bewaakt
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label={isEnergie ? "Leverancier" : "Verzekeraar"} value={analysis.verzekeraar_huidig} />
            <DetailRow label="Premie" value={`\u20AC${Number(analysis.premie_huidig).toFixed(2)} /mnd`} />
            <DetailRow label="Dekking" value={analysis.dekking} />
            <DetailRow label="Polisnummer" value={analysis.polisnummer || "\u2014"} />
            <DetailRow
              label="Einddatum"
              value={analysis.einddatum
                ? new Date(analysis.einddatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
                : "Doorlopend"
              }
            />
            <DetailRow
              label="Bewaakt sinds"
              value={new Date(analysis.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
            />
          </div>

          {/* Contact info */}
          {(analysis.verzekeraar_telefoon || analysis.verzekeraar_website) && (
            <div className="mt-4 pt-4 border-t border-bw-border">
              <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-wider mb-2">
                Contact {analysis.verzekeraar_huidig}
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.verzekeraar_telefoon && (
                  <a href={`tel:${analysis.verzekeraar_telefoon.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bw-bg text-[12px] font-semibold text-bw-deep no-underline hover:bg-bw-blue-light transition-colors border border-bw-border">
                    <svg className="w-3.5 h-3.5 text-bw-blue shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                    {analysis.verzekeraar_telefoon}
                  </a>
                )}
                {analysis.verzekeraar_website && (
                  <a href={analysis.verzekeraar_website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bw-bg text-[12px] font-semibold text-bw-blue no-underline hover:bg-bw-blue-light transition-colors border border-bw-border">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top alternatives from the market ── */}
      {topAlternatives.length > 0 && (
        <div className="bg-white rounded-2xl border border-bw-border overflow-hidden mb-6">
          <div className="px-5 py-3 bg-bw-bg border-b border-bw-border">
            <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">
              Actuele marktprijzen — {productLabel.toLowerCase()}
            </span>
          </div>
          <div className="divide-y divide-bw-border">
            {topAlternatives.map((alt, i) => {
              const saving = Number(analysis.premie_huidig) - alt.premie;
              const isRecommended = alt.naam.toLowerCase() === alertAlt?.toLowerCase();
              return (
                <div
                  key={alt.id}
                  className={`px-5 py-4 flex items-center gap-4 ${isRecommended ? "bg-bw-green-bg/50" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-bold text-white" style={{ backgroundColor: alt.kleur }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-bw-deep">{alt.naam}</span>
                      {isRecommended && (
                        <span className="px-2 py-0.5 rounded-full bg-bw-green-bg text-[10px] font-bold text-bw-green-strong border border-[#BBF7D0]">
                          Aanbevolen
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-bw-text-mid">{alt.dekking} &middot; {alt.eigenRisico} eigen risico</div>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <div className="text-[15px] font-bold text-bw-deep">&euro;{alt.premie.toFixed(2)}<span className="text-[11px] text-bw-text-light font-normal">/mnd</span></div>
                    {saving > 0 && (
                      <div className="text-[11px] font-semibold text-bw-green-strong">&minus;&euro;{saving.toFixed(2)}/mnd</div>
                    )}
                  </div>
                  {alt.url ? (
                    <a
                      href={alt.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold no-underline transition-colors shrink-0 ${
                        isRecommended
                          ? "bg-bw-orange text-white hover:bg-bw-orange-strong shadow-sm"
                          : "bg-bw-bg text-bw-deep border border-bw-border hover:bg-bw-blue-light"
                      }`}
                    >
                      {isRecommended ? "Overstappen" : "Bekijk"} <ArrowRightIcon className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-bw-text-light shrink-0">Geen link</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── How switching works ── */}
      {hasAlert && (
        <div className="bg-white rounded-2xl border border-bw-border p-5 sm:p-6 mb-6">
          <h3 className="text-[14px] font-bold text-bw-deep mb-4">Zo werkt overstappen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { step: "1", title: "Ga naar de verzekeraar", desc: "Klik op 'Overstappen' om naar de website van de verzekeraar te gaan. Bereken daar je persoonlijke premie." },
              { step: "2", title: "Sluit online af", desc: "Kies je dekking en sluit de nieuwe verzekering direct online af. Binnen 5 minuten geregeld." },
              { step: "3", title: "Opzegging geregeld", desc: "De nieuwe verzekeraar regelt in de meeste gevallen de opzegging van je oude polis voor je." },
              { step: "4", title: "Direct verzekerd", desc: "Je nieuwe polis gaat in op de gewenste datum. Je bent altijd verzekerd, zonder gat in de dekking." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-bw-blue flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[12px] font-bold text-white">{step}</span>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-bw-deep mb-0.5">{title}</div>
                  <div className="text-[12px] text-bw-text-mid leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-5 pt-4 border-t border-bw-border flex flex-wrap gap-4">
            {[
              "14 dagen bedenktijd",
              "Geen dubbele dekking",
              "Direct online geregeld",
            ].map((text) => (
              <div key={text} className="flex items-center gap-1.5 text-[12px] text-bw-text-mid">
                <CheckIcon className="w-3.5 h-3.5 text-bw-green shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {hasAlert && matchedAlt?.url && (
          <a
            href={matchedAlt.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold bg-bw-orange text-white hover:bg-bw-orange-strong transition-all no-underline shadow-sm"
          >
            Overstappen naar {matchedAlt.naam} <ArrowRightIcon className="w-4 h-4" />
          </a>
        )}
        <Link
          href={`/upload?type=${isEnergie ? "energie" : "verzekering"}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-bold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg transition-colors no-underline"
        >
          <RefreshCw className="w-4 h-4" /> Opnieuw vergelijken
        </Link>
        <Link
          href="/account"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-[13px] font-semibold text-bw-text-mid hover:text-bw-deep transition-colors no-underline"
        >
          &larr; Naar dashboard
        </Link>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-bw-text-light uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[14px] font-semibold text-bw-deep">{value}</div>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="max-w-[520px] mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bw-bg flex items-center justify-center mx-auto mb-4">
        <Search className="w-6 h-6 text-bw-text-mid" />
      </div>
      <h1 className="font-heading text-xl font-bold text-bw-deep mb-2">Niet gevonden</h1>
      <p className="text-sm text-bw-text-mid mb-6">{message}</p>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-bw-blue text-white hover:bg-bw-blue-strong transition-all no-underline"
      >
        Naar mijn dashboard
      </Link>
    </div>
  );
}
