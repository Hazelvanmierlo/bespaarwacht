"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDemoPolisData } from "@/lib/demo-data";
import { anonymize } from "@/lib/anonymizer";
import { getAlternativesFallback } from "@/lib/market-data";
import { polisToScraperInput } from "@/lib/polis-to-input";
import { VERZEKERAAR_USP } from "@/lib/verzekeraar-meta";
import { CheckIcon, ArrowRightIcon, StarIcon, LockIcon, SaveIcon, ShieldIcon, PulseDot, XIcon } from "@/components/icons";
import type { AnonResult, Alternative, PolisData } from "@/lib/types";
import type { ProductType } from "@/lib/scrapers/base";

const VALID_PRODUCTS: ProductType[] = ["inboedel", "opstal", "aansprakelijkheid", "reis"];

const PRODUCT_LABELS: Record<ProductType, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
};

const PRODUCT_ICONS: Record<ProductType, string> = {
  inboedel: "🏠",
  opstal: "🏗️",
  aansprakelijkheid: "🛡️",
  reis: "✈️",
};

const LIVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LIVE_SCRAPERS === "true";

const analyzeSteps = [
  { step: 1, label: "PDF uitlezen", desc: "Polisgegevens worden geëxtraheerd" },
  { step: 2, label: "Anonimisering", desc: "Persoonsgegevens worden verwijderd" },
  { step: 3, label: LIVE_ENABLED ? "Live premies ophalen" : "Premies berekenen", desc: LIVE_ENABLED ? "Live premies ophalen bij verzekeraars..." : "Exacte premie per verzekeraar berekend" },
  { step: 4, label: "Resultaten klaar", desc: "Betere opties gevonden!" },
];

type SortMode = "besparing" | "premie" | "beoordeling";

export default function AnalyseDemoPage() {
  return (
    <Suspense fallback={<div className="max-w-[520px] mx-auto px-6 py-20 text-center text-bw-text-mid">Laden...</div>}>
      <AnalyseDemoContent />
    </Suspense>
  );
}

function AnalyseDemoContent() {
  const searchParams = useSearchParams();
  const productParam = searchParams.get("product") as ProductType | null;
  const sourceParam = searchParams.get("source");
  const productType: ProductType = productParam && VALID_PRODUCTS.includes(productParam) ? productParam : "inboedel";

  const [animStep, setAnimStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [anonData, setAnonData] = useState<AnonResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>(getAlternativesFallback(productType));
  const [dataSource, setDataSource] = useState<"demo" | "calculated" | "upload" | "live">("demo");
  const [sortMode, setSortMode] = useState<SortMode>("besparing");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [overstapModal, setOverstapModal] = useState<(Alternative & { besparingJaar: number }) | null>(null);

  const [polisData, setPolisData] = useState<PolisData>(() => getDemoPolisData(productType));

  useEffect(() => {
    if (sourceParam === "upload") {
      try {
        const stored = sessionStorage.getItem("bw-upload-polis");
        if (stored) {
          const parsed = JSON.parse(stored) as PolisData;
          setPolisData(parsed);
          setDataSource("upload");
          sessionStorage.removeItem("bw-upload-polis");
          sessionStorage.removeItem("bw-upload-product");
        }
      } catch { /* Fall through to demo data */ }
    }
  }, [sourceParam]);

  const huidigeMaand = polisData.maandpremie;
  const huidigeJaar = polisData.jaarpremie;

  const sortedAlts = [...alternatives]
    .map((alt) => ({
      ...alt,
      besparingMaand: +(huidigeMaand - alt.premie).toFixed(2),
      besparingJaar: +((huidigeMaand - alt.premie) * 12).toFixed(0),
    }))
    .sort((a, b) => {
      if (sortMode === "premie") return a.premie - b.premie;
      if (sortMode === "beoordeling") return b.beoordeling - a.beoordeling || a.premie - b.premie;
      return b.besparingJaar - a.besparingJaar;
    });

  const besteSaving = sortedAlts[0];
  const heeftBesparing = besteSaving && besteSaving.besparingJaar > 0;

  useEffect(() => {
    const anon = anonymize(polisData);
    setAnonData(anon);

    const scrapeInput = polisToScraperInput(polisData, productType);
    const scrapePromise = fetch("/api/scrape/ondemand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scrapeInput, productType }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.length >= 2) {
          setAlternatives(json.data);
          setDataSource(json.source === "live" ? "live" : "calculated");
        }
      })
      .catch(() => { /* Keep fallback */ });

    const timers = [
      setTimeout(() => setAnimStep(1), 600),
      setTimeout(() => setAnimStep(2), 1800),
      setTimeout(() => setAnimStep(3), LIVE_ENABLED ? 4000 : 3200),
    ];

    const minDelay = new Promise((r) => setTimeout(r, LIVE_ENABLED ? 15000 : 4200));
    Promise.all([scrapePromise, minDelay]).then(() => {
      setAnimStep(4);
      setShowResults(true);
    });

    return () => timers.forEach(clearTimeout);
  }, [productType, polisData]);

  const handleSave = () => {
    if (!anonData) return;
    const entry = {
      id: anonData.klantId,
      datum: new Date().toISOString(),
      verzekeraar: polisData.verzekeraar,
      type: polisData.type,
      dekking: polisData.dekking,
      maandpremie: polisData.maandpremie,
      woning: polisData.woning,
      oppervlakte: polisData.oppervlakte,
      postcode: polisData.postcode.slice(0, 4) + "**",
      woonplaats: polisData.woonplaats,
      maxBesparing: besteSaving.besparingJaar,
      monitoringActive: true,
    };
    const existing = JSON.parse(localStorage.getItem("bw-polissen") || "[]");
    localStorage.setItem("bw-polissen", JSON.stringify([entry, ...existing.filter((p: { id: string }) => p.id !== entry.id)]));
    setSaved(true);
  };

  // === LOADING ANIMATION ===
  if (!showResults) {
    return (
      <div className="max-w-[520px] mx-auto px-6 py-20">
        <h2 className="font-heading text-[28px] font-bold text-bw-deep text-center mb-10">
          {PRODUCT_LABELS[productType]} wordt geanalyseerd...
        </h2>
        {analyzeSteps.map((s) => (
          <div
            key={s.step}
            className={`flex items-center gap-4 py-3.5 border-b border-[#F1F5F9] transition-all duration-500 ${
              animStep >= s.step ? "opacity-100" : "opacity-30"
            } ${animStep >= s.step ? "animate-slideIn" : ""}`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-all duration-400 ${
                animStep >= s.step ? "bg-bw-green text-white" : "bg-bw-border text-bw-text-light"
              }`}
            >
              {animStep >= s.step ? <CheckIcon className="w-3.5 h-3.5" /> : s.step}
            </div>
            <div>
              <div className={`text-[15px] font-semibold transition-all duration-400 ${animStep >= s.step ? "text-bw-deep" : "text-bw-text-light"}`}>
                {s.label}
              </div>
              <div className={`text-[13px] transition-all duration-400 ${animStep >= s.step ? "text-bw-text-mid" : "text-[#CBD5E1]"}`}>
                {s.desc}
              </div>
            </div>
            {animStep === s.step && (
              <div className="ml-auto w-5 h-5 border-2 border-bw-green border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // === RESULTS ===
  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-10 pb-20">

      {/* ── HERO ── */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-md text-[13px] font-bold mb-3">
          <CheckIcon className="w-3.5 h-3.5" /> Analyse compleet
        </div>
        {heeftBesparing ? (
          <>
            <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
              Bespaar <span className="text-bw-green">&euro; {besteSaving.besparingJaar}</span> per jaar
            </h2>
            <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
              Je betaalt nu <strong className="text-bw-red">&euro; {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              Bij {besteSaving.naam} betaal je <strong className="text-bw-green">&euro; {besteSaving.premie.toFixed(2)}/mnd</strong>.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
              Je zit al <span className="text-bw-green">goed</span>!
            </h2>
            <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
              Je betaalt <strong className="text-bw-green">&euro; {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              Geen van de {sortedAlts.length} vergeleken verzekeraars is goedkoper.
            </p>
          </>
        )}
      </div>

      {/* ── PROFIEL SAMENVATTING ── */}
      <ProfileSummary polisData={polisData} productType={productType} />

      {/* ── HUIDIGE POLIS ── */}
      <div className={`rounded-xl px-5 py-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${
        heeftBesparing
          ? "bg-bw-red-bg border-[#FECACA]"
          : "bg-[#F0FDF4] border-[#BBF7D0]"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
            heeftBesparing ? "bg-[#FECACA]" : "bg-[#BBF7D0]"
          }`}>{PRODUCT_ICONS[productType]}</div>
          <div>
            <div className={`text-xs font-bold uppercase tracking-[0.5px] ${
              heeftBesparing ? "text-bw-red" : "text-bw-green-strong"
            }`}>Huidige polis{!heeftBesparing && " · Beste prijs"}</div>
            <div className={`text-[15px] font-bold ${
              heeftBesparing ? "text-[#991B1B]" : "text-[#166534]"
            }`}>{polisData.verzekeraar} — {polisData.type}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${heeftBesparing ? "text-bw-red" : "text-bw-green"}`}>&euro; {huidigeMaand.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
          <div className={`text-[11px] ${heeftBesparing ? "text-[#B91C1C]" : "text-[#166534]"}`}>&euro; {huidigeJaar.toFixed(2)}/jaar · {polisData.dekking}</div>
        </div>
      </div>

      {/* ── SORT CONTROLS ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[12px] font-semibold text-bw-text-mid">Sorteer:</span>
        {([
          { key: "besparing" as SortMode, label: "Hoogste besparing" },
          { key: "premie" as SortMode, label: "Laagste premie" },
          { key: "beoordeling" as SortMode, label: "Beste beoordeling" },
        ]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortMode(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
              sortMode === opt.key
                ? "bg-bw-deep text-white border-bw-deep"
                : "bg-white text-bw-text-mid border-bw-border hover:border-bw-deep"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-bw-text-light">
          {sortedAlts.length} verzekeraars vergeleken
        </span>
      </div>

      {/* ── ALTERNATIEVEN ── */}
      <div className="flex flex-col gap-3">
        {sortedAlts.map((alt, i) => {
          const isExpanded = expandedCard === alt.id;
          const isTop = i === 0 && heeftBesparing;
          const usp = VERZEKERAAR_USP[alt.id] || "";

          return (
            <div
              key={alt.id}
              className={`bg-white rounded-2xl overflow-hidden transition-all ${
                isTop ? "border-2 border-bw-green shadow-[0_4px_20px_rgba(22,163,74,0.08)]" : "border border-bw-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              }`}
            >
              {/* Top badge */}
              {isTop && (
                <div className="bg-bw-green px-5 py-1.5 flex items-center justify-center gap-2">
                  <span className="text-[13px] font-bold text-white">Aanbeveling — Bespaar &euro; {alt.besparingJaar}/jaar</span>
                </div>
              )}

              <div className="flex items-stretch">
                {/* Kleur accent bar */}
                <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: alt.kleur || "#94A3B8" }} />

                <div className="flex-1 px-4 sm:px-5 py-4">
                  {/* Row 1: Naam + badges + ranking */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Ranking + Logo */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                        isTop ? "bg-bw-green text-white" : "bg-bw-bg text-bw-text-mid"
                      }`}>
                        #{i + 1}
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: alt.kleur || "#94A3B8" }}
                      >
                        {alt.naam.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Name + rating + highlight */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[16px] font-bold text-bw-deep">{alt.naam}</h3>
                        {alt.highlight && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                            alt.highlight === "Hoogste besparing" ? "bg-bw-green-bg text-bw-green-strong" :
                            alt.highlight === "Beste uit de Test" ? "bg-bw-blue-light text-[#1D4ED8]" :
                            alt.highlight === "Laagste premie" ? "bg-[#FFF7ED] text-[#C2410C]" :
                            "bg-[#F3F4F6] text-bw-text-mid"
                          }`}>{alt.highlight}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-bw-text-mid mt-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} />)}
                        </div>
                        <span>{alt.beoordelingBron}</span>
                      </div>
                    </div>

                    {/* Price block (desktop) */}
                    <div className="hidden sm:block text-right shrink-0">
                      <div className={`text-[22px] font-bold leading-tight ${alt.besparingJaar > 0 ? "text-bw-green" : "text-bw-text-mid"}`}>
                        &euro; {alt.premie.toFixed(2)}<span className="text-xs font-semibold">/mnd</span>
                      </div>
                      {alt.besparingJaar > 0 ? (
                        <div className="text-[12px] font-semibold text-bw-green-strong">
                          &euro; {alt.besparingMaand.toFixed(2)}/mnd goedkoper
                        </div>
                      ) : alt.besparingJaar < 0 ? (
                        <div className="text-[12px] text-bw-text-light">
                          &euro; {Math.abs(alt.besparingMaand).toFixed(2)}/mnd duurder
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Row 2: Details chips */}
                  <div className="flex items-center gap-3 flex-wrap mb-3 text-[12px]">
                    <ProductChips alt={alt} productType={productType} />
                  </div>

                  {/* Row 3: Price (mobile) + CTA */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Mobile price */}
                    <div className="sm:hidden">
                      <span className={`text-[20px] font-bold ${alt.besparingJaar > 0 ? "text-bw-green" : "text-bw-text-mid"}`}>
                        &euro; {alt.premie.toFixed(2)}<span className="text-xs font-semibold">/mnd</span>
                      </span>
                      {alt.besparingJaar > 0 && (
                        <span className="ml-2 text-[12px] font-semibold text-bw-green-strong">
                          = &euro; {alt.besparingJaar}/jaar besparing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {/* Expand details */}
                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : alt.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-bw-text-mid bg-bw-bg border border-bw-border cursor-pointer hover:bg-[#E2E8F0] transition-colors"
                      >
                        {isExpanded ? "Minder" : "Meer info"}
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {/* CTA */}
                      <button
                        onClick={() => setOverstapModal({ ...alt })}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold text-white cursor-pointer border-none transition-all hover:-translate-y-px ${
                          isTop
                            ? "bg-bw-green hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)]"
                            : "bg-bw-deep hover:bg-bw-navy hover:shadow-[0_4px_16px_rgba(15,33,55,0.2)]"
                        }`}
                      >
                        Bekijk bij {alt.naam} <ArrowRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-bw-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Dekking</div>
                          <div className="space-y-1.5 text-[13px]">
                            <DetailRow label="Type" value={alt.dekking} />
                            <DetailRow label="Eigen risico" value={alt.eigenRisico} />
                            <ProductDetails alt={alt} productType={productType} polisData={polisData} />
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Over {alt.naam}</div>
                          <div className="space-y-1.5 text-[13px]">
                            <div className="flex items-center gap-1.5 mb-2">
                              {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} className="w-4 h-4" />)}
                              <span className="font-semibold text-bw-deep ml-1">{alt.beoordelingBron}</span>
                            </div>
                            {usp && <p className="text-bw-text-mid leading-relaxed">{usp}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SAVE + MONITORING ── */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saved}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold bg-bw-deep text-white border-none cursor-pointer font-[inherit] hover:bg-bw-navy transition-colors disabled:opacity-50 min-w-[200px]"
        >
          <ShieldIcon className="w-4 h-4" />
          {saved ? (
            <><PulseDot /> Monitoring actief</>
          ) : (
            <>Activeer 24/7 monitoring</>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saved}
          className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-[14px] font-semibold bg-white text-bw-deep border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors disabled:opacity-50"
        >
          <SaveIcon className="w-4 h-4" /> {saved ? "Opgeslagen" : "Opslaan"}
        </button>
      </div>

      {/* ── PRIVACY ── */}
      <div className="flex items-center gap-2.5 mt-4 px-4 py-2.5 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
        <LockIcon />
        <span className="text-xs text-bw-green-dark">
          <strong>Geen persoonsgegevens opgeslagen.</strong> PDF is verwijderd. Alleen geanonimiseerde data.{" "}
          <Link href="/privacy" className="underline">Privacy →</Link>
        </span>
      </div>

      {/* ── DATA SOURCE ── */}
      <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border ${
        dataSource === "live" ? "bg-[#F0FDF4] border-[#BBF7D0]" :
        dataSource === "calculated" ? "bg-[#EFF6FF] border-[#BFDBFE]" :
        dataSource === "upload" ? "bg-[#F0FDF4] border-[#BBF7D0]" :
        "bg-[#FFF7ED] border-[#FED7AA]"
      }`}>
        <span className={`text-[11px] ${
          dataSource === "live" ? "text-[#166534]" :
          dataSource === "calculated" ? "text-[#1D4ED8]" :
          dataSource === "upload" ? "text-[#166534]" :
          "text-[#C2410C]"
        }`}>
          {dataSource === "live" ? (
            <><strong>Live premies</strong> — Echte premies opgehaald bij {alternatives.length} verzekeraars.</>
          ) : dataSource === "calculated" ? (
            <><strong>Berekende premies</strong> — Op basis van markttarieven berekend voor {alternatives.length} verzekeraars.</>
          ) : dataSource === "upload" ? (
            <><strong>Upload analyse</strong> — Premies berekend op basis van je eigen polisgegevens.</>
          ) : (
            <><strong>Demo premies</strong> — Voorbeelddata. Live scraping niet beschikbaar.</>
          )}
        </span>
      </div>

      {/* ── DISCLAIMER ── */}
      <div className="mt-4 p-3 bg-bw-bg rounded-lg border-l-[3px] border-bw-border">
        <p className="text-[11px] text-bw-text-light leading-relaxed">
          <strong className="text-bw-text-mid">Provisie-disclosure:</strong> Bij afsluiting via DeVerzekeringsAgent ontvangen wij een vergoeding van de verzekeraar. Dit kost jou niets extra. Premies zijn berekend op basis van je profiel.
        </p>
      </div>

      {/* ── OVERSTAP MODAL ── */}
      {overstapModal && (
        <OverstapModal
          alt={overstapModal}
          polisData={polisData}
          productType={productType}
          onClose={() => setOverstapModal(null)}
        />
      )}
    </div>
  );
}

/* ─── PROFILE SUMMARY ─── */
function ProfileSummary({ polisData, productType }: { polisData: PolisData; productType: ProductType }) {
  type Field = { label: string; value: string; filled: boolean };

  const getFields = (): Field[] => {
    const f = (label: string, val: string | undefined | null) => ({
      label,
      value: val || "",
      filled: !!val && val !== "0" && val !== "€ 0",
    });

    if (productType === "inboedel" || productType === "opstal") {
      return [
        f("Postcode", polisData.postcode),
        f("Woningtype", polisData.woning),
        f("Oppervlakte", polisData.oppervlakte),
        f("Dekking", polisData.dekking),
        f("Gezin", polisData.gezin),
        f("Huisnummer", polisData.huisnummer),
        f("Geboortedatum", polisData.geboortedatum),
      ];
    }
    if (productType === "aansprakelijkheid") {
      return [
        f("Postcode", polisData.postcode),
        f("Gezin", polisData.gezin),
        f("Geboortedatum", polisData.geboortedatum),
      ];
    }
    // reis
    return [
      f("Gezin", polisData.gezin),
      f("Dekking", polisData.dekking),
      f("Geboortedatum", polisData.geboortedatum),
    ];
  };

  const fields = getFields();
  const filledCount = fields.filter((f) => f.filled).length;

  return (
    <div className="mb-6 bg-white rounded-xl border border-bw-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">
          Jouw profiel
        </div>
        <Link href="/upload" className="text-[11px] font-semibold text-bw-blue hover:underline">
          Wijzig gegevens
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((field) => (
          <span
            key={field.label}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              field.filled
                ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                : "bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]"
            }`}
          >
            {field.filled ? (
              <CheckIcon className="w-2.5 h-2.5" />
            ) : (
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v4M12 17h.01" /></svg>
            )}
            {field.label}{field.filled ? `: ${field.value}` : ""}
          </span>
        ))}
      </div>
      {filledCount < fields.length && (
        <p className="mt-2 text-[11px] text-[#C2410C]">
          Vul ontbrekende velden in voor nauwkeurigere premies.
        </p>
      )}
    </div>
  );
}

/* ─── PRODUCT-SPECIFIC CHIPS ─── */
function ProductChips({ alt, productType }: { alt: Alternative; productType: ProductType }) {
  const chips: { label: string; value: string }[] = [
    { label: "Dekking", value: alt.dekking },
    { label: "Eigen risico", value: alt.eigenRisico },
  ];

  if (productType === "reis") {
    if (alt.dekking.toLowerCase().includes("doorlopend")) chips.push({ label: "Type", value: "Doorlopend" });
    else if (alt.dekking.toLowerCase().includes("kortlopend")) chips.push({ label: "Type", value: "Kortlopend" });
  }

  return (
    <>
      {chips.map((chip) => (
        <span key={chip.label} className="inline-flex items-center gap-1 text-bw-text-mid">
          <span className="font-medium text-bw-text-light">{chip.label}:</span>
          <span className="font-semibold text-bw-deep">{chip.value}</span>
        </span>
      ))}
    </>
  );
}

/* ─── PRODUCT-SPECIFIC EXPANDED DETAILS ─── */
function ProductDetails({ alt, productType, polisData }: { alt: Alternative; productType: ProductType; polisData: PolisData }) {
  if (productType === "inboedel" || productType === "opstal") {
    return (
      <>
        {polisData.woning && <DetailRow label="Woningtype" value={polisData.woning} />}
        {polisData.oppervlakte && <DetailRow label="Oppervlakte" value={polisData.oppervlakte} />}
        {polisData.gezin && <DetailRow label="Gezin" value={polisData.gezin} />}
      </>
    );
  }
  if (productType === "aansprakelijkheid") {
    return (
      <>
        {polisData.gezin && <DetailRow label="Gezinsdekking" value={polisData.gezin.toLowerCase().includes("gezin") ? "Ja" : "Nee"} />}
      </>
    );
  }
  if (productType === "reis") {
    return (
      <>
        <DetailRow label="Reisgebied" value={alt.dekking.toLowerCase().includes("wereld") ? "Wereldwijd" : "Europa"} />
        <DetailRow label="Type" value={alt.dekking.toLowerCase().includes("doorlopend") ? "Doorlopend" : "Kortlopend"} />
      </>
    );
  }
  return null;
}

/* ─── DETAIL ROW ─── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-bw-bg">
      <span className="text-bw-text-mid">{label}</span>
      <span className="font-semibold text-bw-deep">{value}</span>
    </div>
  );
}

/* ─── OVERSTAP MODAL ─── */
function OverstapModal({ alt, polisData, productType, onClose }: {
  alt: Alternative & { besparingJaar: number };
  polisData: PolisData;
  productType: ProductType;
  onClose: () => void;
}) {
  const handleGoDoor = () => {
    window.open(alt.url, "_blank", "noopener,noreferrer");
    onClose();
  };

  // Gather relevant profile fields to show as "take these with you" tips
  const tipFields: { label: string; value: string }[] = [];
  if (polisData.postcode) tipFields.push({ label: "Postcode", value: polisData.postcode });
  if (polisData.huisnummer) tipFields.push({ label: "Huisnummer", value: polisData.huisnummer });
  if (polisData.geboortedatum) tipFields.push({ label: "Geboortedatum", value: polisData.geboortedatum });
  if (polisData.gezin) tipFields.push({ label: "Gezin", value: polisData.gezin });
  if ((productType === "inboedel" || productType === "opstal") && polisData.woning) {
    tipFields.push({ label: "Woningtype", value: polisData.woning });
  }
  if ((productType === "inboedel" || productType === "opstal") && polisData.oppervlakte) {
    tipFields.push({ label: "Oppervlakte", value: polisData.oppervlakte });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] max-w-[480px] w-full overflow-hidden animate-fadeUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: alt.kleur || "#94A3B8" }}
            >
              {alt.naam.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-bw-deep">{alt.naam}</h3>
              <p className="text-[13px] text-bw-text-mid">{PRODUCT_LABELS[productType]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bw-bg transition-colors cursor-pointer border-none bg-transparent">
            <XIcon className="w-5 h-5 text-bw-text-light" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Savings banner */}
          {alt.besparingJaar > 0 && (
            <div className="bg-bw-green-bg rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bw-green flex items-center justify-center text-white text-lg font-bold shrink-0">
                &euro;
              </div>
              <div>
                <div className="text-[15px] font-bold text-bw-green-strong">
                  &euro; {alt.besparingJaar}/jaar besparing
                </div>
                <div className="text-[12px] text-[#166534]">
                  Van &euro; {polisData.maandpremie.toFixed(2)}/mnd naar &euro; {alt.premie.toFixed(2)}/mnd
                </div>
              </div>
            </div>
          )}

          {/* Profile fields to take along */}
          {tipFields.length > 0 && (
            <div className="mb-4">
              <div className="text-[12px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">
                Neem deze gegevens mee
              </div>
              <div className="bg-bw-bg rounded-lg p-3 space-y-1.5">
                {tipFields.map((f) => (
                  <div key={f.label} className="flex justify-between text-[13px]">
                    <span className="text-bw-text-mid">{f.label}</span>
                    <span className="font-semibold text-bw-deep">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info text */}
          <p className="text-[13px] text-bw-text-mid leading-relaxed mb-5">
            Je gaat naar de website van {alt.naam} om een offerte aan te vragen.
            Na afsluiting regelt {alt.naam} de opzegging bij je huidige verzekeraar.
            Je hebt altijd 14 dagen bedenktijd.
          </p>

          {/* CTA */}
          <button
            onClick={handleGoDoor}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white border-none cursor-pointer hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)] transition-all"
          >
            Ga door naar {alt.naam} <ArrowRightIcon className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-bw-text-light text-center mt-3">
            Dezelfde prijs als rechtstreeks — wij ontvangen een vergoeding van de verzekeraar.
          </p>
        </div>
      </div>
    </div>
  );
}
