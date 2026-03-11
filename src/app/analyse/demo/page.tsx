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
  inboedel: "\u{1F3E0}",
  opstal: "\u{1F3D7}\uFE0F",
  aansprakelijkheid: "\u{1F6E1}\uFE0F",
  reis: "\u{2708}\uFE0F",
};

const LIVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LIVE_SCRAPERS === "true";

const analyzeSteps = [
  { step: 1, label: "PDF uitlezen", desc: "Polisgegevens worden ge\u{00EB}xtraheerd" },
  { step: 2, label: "Anonimisering", desc: "Persoonsgegevens worden verwijderd" },
  { step: 3, label: LIVE_ENABLED ? "Live premies ophalen" : "Premies berekenen", desc: LIVE_ENABLED ? "Live premies ophalen bij verzekeraars..." : "Exacte premie per verzekeraar berekend" },
  { step: 4, label: "Resultaten klaar", desc: "Betere opties gevonden!" },
];

type SortMode = "besparing" | "premie" | "beoordeling";

/* ── Coverage items per dekking type ── */
const COVERAGE_INBOEDEL: Record<string, { label: string; basis: boolean; uitgebreid: boolean; allrisk: boolean }> = {
  brand: { label: "Brand & storm", basis: true, uitgebreid: true, allrisk: true },
  inbraak: { label: "Inbraak & diefstal", basis: true, uitgebreid: true, allrisk: true },
  water: { label: "Waterschade", basis: false, uitgebreid: true, allrisk: true },
  lekkage: { label: "Lekkage", basis: false, uitgebreid: true, allrisk: true },
  glas: { label: "Glasbreuk", basis: false, uitgebreid: true, allrisk: true },
  allrisk: { label: "Onverwachte schade", basis: false, uitgebreid: false, allrisk: true },
};

const COVERAGE_OPSTAL: Record<string, { label: string; basis: boolean; uitgebreid: boolean; allrisk: boolean }> = {
  brand: { label: "Brand & ontploffing", basis: true, uitgebreid: true, allrisk: true },
  storm: { label: "Storm & hagel", basis: true, uitgebreid: true, allrisk: true },
  water: { label: "Waterschade", basis: false, uitgebreid: true, allrisk: true },
  lekkage: { label: "Lekkage leidingen", basis: false, uitgebreid: true, allrisk: true },
  glas: { label: "Glasbreuk", basis: false, uitgebreid: true, allrisk: true },
  allrisk: { label: "Onverwachte schade", basis: false, uitgebreid: false, allrisk: true },
};

const COVERAGE_AANSPRAKELIJKHEID: Record<string, { label: string; always: boolean }> = {
  persoon: { label: "Letselschade", always: true },
  zaak: { label: "Zaakschade", always: true },
  gezin: { label: "Gezinsleden meeverzekerd", always: false },
  sport: { label: "Sportactiviteiten", always: true },
  huisdier: { label: "Huisdieren", always: true },
};

const COVERAGE_REIS: Record<string, { label: string; basis: boolean; uitgebreid: boolean }> = {
  medisch: { label: "Medische kosten", basis: true, uitgebreid: true },
  bagage: { label: "Bagage & diefstal", basis: true, uitgebreid: true },
  annulering: { label: "Annulering", basis: false, uitgebreid: true },
  pechhulp: { label: "Pechhulp buitenland", basis: false, uitgebreid: true },
  reisrechts: { label: "Rechtsbijstand", basis: false, uitgebreid: true },
};

function getCoverageItems(productType: ProductType, dekking: string, gezin?: string) {
  const d = dekking.toLowerCase();
  const isAllRisk = d.includes("all risk") || d.includes("allrisk");
  const isUitgebreid = d.includes("uitgebreid") || d.includes("extra") || isAllRisk;

  if (productType === "inboedel") {
    return Object.values(COVERAGE_INBOEDEL).map((c) => ({
      label: c.label,
      covered: isAllRisk ? c.allrisk : isUitgebreid ? c.uitgebreid : c.basis,
    }));
  }
  if (productType === "opstal") {
    return Object.values(COVERAGE_OPSTAL).map((c) => ({
      label: c.label,
      covered: isAllRisk ? c.allrisk : isUitgebreid ? c.uitgebreid : c.basis,
    }));
  }
  if (productType === "aansprakelijkheid") {
    const heeftGezin = gezin?.toLowerCase().includes("gezin") || gezin?.toLowerCase().includes("partner");
    return Object.values(COVERAGE_AANSPRAKELIJKHEID).map((c) => ({
      label: c.label,
      covered: c.label === "Gezinsleden meeverzekerd" ? !!heeftGezin : c.always,
    }));
  }
  // reis
  return Object.values(COVERAGE_REIS).map((c) => ({
    label: c.label,
    covered: isUitgebreid ? c.uitgebreid : c.basis,
  }));
}

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
  const [eigenRisicoFilter, setEigenRisicoFilter] = useState<string>("alle");

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

  const filteredAndSorted = [...alternatives]
    .map((alt) => ({
      ...alt,
      besparingMaand: +(huidigeMaand - alt.premie).toFixed(2),
      besparingJaar: +((huidigeMaand - alt.premie) * 12).toFixed(0),
    }))
    .filter((alt) => {
      if (eigenRisicoFilter === "alle") return true;
      const er = alt.eigenRisico.replace(/[^0-9]/g, "");
      if (eigenRisicoFilter === "0") return er === "0";
      if (eigenRisicoFilter === "150") return parseInt(er) <= 150;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "premie") return a.premie - b.premie;
      if (sortMode === "beoordeling") return b.beoordeling - a.beoordeling || a.premie - b.premie;
      return b.besparingJaar - a.besparingJaar;
    });

  const besteSaving = filteredAndSorted[0];
  const heeftBesparing = besteSaving && besteSaving.besparingJaar > 0;

  // Check if there are different eigen risico values for the filter
  const eigenRisicoValues = [...new Set(alternatives.map((a) => a.eigenRisico))];
  const showERFilter = eigenRisicoValues.length > 1;

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
      maxBesparing: besteSaving?.besparingJaar || 0,
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
              Geen van de {filteredAndSorted.length} vergeleken verzekeraars is goedkoper.
            </p>
          </>
        )}
      </div>

      {/* ── TRUST BAR ── */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 py-3 px-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex-wrap">
        <TrustItem icon={<ShieldCheckSVG />} label="Onafhankelijk" />
        <TrustItem icon={<UsersSVG />} label={`${filteredAndSorted.length} verzekeraars`} />
        <TrustItem icon={<LockIcon className="w-3.5 h-3.5" />} label="Privacygarantie" />
        <TrustItem icon={<ThumbsUpSVG />} label="Gratis & vrijblijvend" />
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
            }`}>Huidige polis{!heeftBesparing && " \u{00B7} Beste prijs"}</div>
            <div className={`text-[15px] font-bold ${
              heeftBesparing ? "text-[#991B1B]" : "text-[#166534]"
            }`}>{polisData.verzekeraar} \u{2014} {polisData.type}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${heeftBesparing ? "text-bw-red" : "text-bw-green"}`}>&euro; {huidigeMaand.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
          <div className={`text-[11px] ${heeftBesparing ? "text-[#B91C1C]" : "text-[#166534]"}`}>&euro; {huidigeJaar.toFixed(2)}/jaar &middot; {polisData.dekking}</div>
        </div>
      </div>

      {/* ── SORT + FILTER CONTROLS ── */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
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
      </div>
      {showERFilter && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[12px] font-semibold text-bw-text-mid">Eigen risico:</span>
          {([
            { key: "alle", label: "Alle" },
            { key: "0", label: "\u{20AC} 0" },
            { key: "150", label: "\u{2264} \u{20AC} 150" },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setEigenRisicoFilter(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer ${
                eigenRisicoFilter === opt.key
                  ? "bg-bw-deep text-white border-bw-deep"
                  : "bg-white text-bw-text-mid border-bw-border hover:border-bw-deep"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-bw-text-light">
            {filteredAndSorted.length} resultaten
          </span>
        </div>
      )}
      {!showERFilter && (
        <div className="flex items-center mb-4">
          <span className="ml-auto text-[11px] text-bw-text-light">
            {filteredAndSorted.length} verzekeraars vergeleken
          </span>
        </div>
      )}

      {/* ── ALTERNATIEVEN ── */}
      <div className="flex flex-col gap-3">
        {filteredAndSorted.map((alt, i) => {
          const isExpanded = expandedCard === alt.id;
          const isTop = i === 0 && heeftBesparing;
          const usp = VERZEKERAAR_USP[alt.id] || "";
          const coverageItems = getCoverageItems(productType, alt.dekking, polisData.gezin);

          return (
            <div
              key={alt.id}
              className={`bg-white rounded-2xl overflow-hidden transition-all ${
                isTop ? "border-2 border-bw-green shadow-[0_4px_24px_rgba(22,163,74,0.10)]" : "border border-bw-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
              }`}
            >
              {/* Top badge */}
              {isTop && (
                <div className="bg-gradient-to-r from-[#16A34A] to-[#15803D] px-5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    <span className="text-[13px] font-bold text-white">Beste keuze</span>
                  </div>
                  <span className="text-[13px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-md">
                    Bespaar &euro; {alt.besparingJaar}/jaar
                  </span>
                </div>
              )}

              <div className="flex items-stretch">
                {/* Kleur accent bar */}
                <div className="w-1.5 shrink-0" style={{ backgroundColor: alt.kleur || "#94A3B8" }} />

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

                  {/* Row 2: Coverage checkmarks */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                    {coverageItems.map((item) => (
                      <span key={item.label} className="inline-flex items-center gap-1 text-[12px]">
                        {item.covered ? (
                          <svg className="w-3.5 h-3.5 text-bw-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-[#D1D5DB] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        )}
                        <span className={item.covered ? "text-bw-deep" : "text-[#9CA3AF]"}>{item.label}</span>
                      </span>
                    ))}
                  </div>

                  {/* Row 3: Details chips */}
                  <div className="flex items-center gap-3 flex-wrap mb-3 text-[12px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                      <span className="text-bw-text-light">Dekking:</span>
                      <span className="font-semibold text-bw-deep">{alt.dekking}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                      <span className="text-bw-text-light">Eigen risico:</span>
                      <span className="font-semibold text-bw-deep">{alt.eigenRisico}</span>
                    </span>
                    {productType === "reis" && alt.dekking.toLowerCase().includes("doorlopend") && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                        <span className="text-bw-text-light">Type:</span>
                        <span className="font-semibold text-bw-deep">Doorlopend</span>
                      </span>
                    )}
                  </div>

                  {/* Row 4: Price (mobile) + CTA */}
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
                        {isExpanded ? "Minder" : "Bekijk dekking"}
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {/* CTA */}
                      <button
                        onClick={() => setOverstapModal({ ...alt })}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white cursor-pointer border-none transition-all hover:-translate-y-px ${
                          isTop
                            ? "bg-bw-green hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)]"
                            : "bg-bw-deep hover:bg-bw-navy hover:shadow-[0_4px_16px_rgba(15,33,55,0.2)]"
                        }`}
                      >
                        Bereken premie <ArrowRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-bw-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Left: Coverage details */}
                        <div>
                          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-3">Dekking details</div>
                          <div className="space-y-2">
                            {coverageItems.map((item) => (
                              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                                <span className="text-[13px] text-bw-text-mid">{item.label}</span>
                                {item.covered ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-bw-green-strong">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    Gedekt
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9CA3AF]">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                    Niet gedekt
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 space-y-1.5 text-[13px]">
                            <DetailRow label="Type dekking" value={alt.dekking} />
                            <DetailRow label="Eigen risico" value={alt.eigenRisico} />
                            <ProductDetails alt={alt} productType={productType} polisData={polisData} />
                          </div>
                        </div>

                        {/* Right: About + pricing */}
                        <div>
                          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-3">Over {alt.naam}</div>
                          <div className="flex items-center gap-1.5 mb-3">
                            {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} className="w-4 h-4" />)}
                            <span className="font-semibold text-bw-deep ml-1">{alt.beoordelingBron}</span>
                          </div>
                          {usp && <p className="text-[13px] text-bw-text-mid leading-relaxed mb-3">{usp}</p>}

                          {/* Price comparison */}
                          <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 mt-3">
                            <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Prijsvergelijking</div>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-bw-text-mid">Huidig ({polisData.verzekeraar})</span>
                              <span className="font-semibold text-bw-red">&euro; {huidigeMaand.toFixed(2)}/mnd</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                              <span className="text-bw-text-mid">{alt.naam}</span>
                              <span className="font-semibold text-bw-green">&euro; {alt.premie.toFixed(2)}/mnd</span>
                            </div>
                            {alt.besparingJaar > 0 && (
                              <div className="flex justify-between text-[13px] pt-2 border-t border-[#E2E8F0]">
                                <span className="font-semibold text-bw-deep">Besparing per jaar</span>
                                <span className="font-bold text-bw-green">&euro; {alt.besparingJaar}</span>
                              </div>
                            )}
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

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-10 text-bw-text-mid">
          <p className="text-[15px]">Geen resultaten met deze filters.</p>
          <button onClick={() => setEigenRisicoFilter("alle")} className="mt-2 text-bw-blue font-semibold text-[13px] cursor-pointer bg-transparent border-none">
            Filters resetten
          </button>
        </div>
      )}

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
          <Link href="/privacy" className="underline">Privacy \u{2192}</Link>
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
            <><strong>Live premies</strong> \u{2014} Echte premies opgehaald bij {alternatives.length} verzekeraars.</>
          ) : dataSource === "calculated" ? (
            <><strong>Berekende premies</strong> \u{2014} Op basis van markttarieven berekend voor {alternatives.length} verzekeraars.</>
          ) : dataSource === "upload" ? (
            <><strong>Upload analyse</strong> \u{2014} Premies berekend op basis van je eigen polisgegevens.</>
          ) : (
            <><strong>Demo premies</strong> \u{2014} Voorbeelddata. Live scraping niet beschikbaar.</>
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
          huidigeMaand={huidigeMaand}
          onClose={() => setOverstapModal(null)}
        />
      )}
    </div>
  );
}

/* ─── TRUST BAR ITEM ─── */
function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-medium text-bw-text-mid">
      <span className="text-bw-green-strong">{icon}</span>
      {label}
    </div>
  );
}

/* ─── TRUST BAR SVG ICONS ─── */
function ShieldCheckSVG() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function UsersSVG() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ThumbsUpSVG() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

/* ─── PROFILE SUMMARY ─── */
function ProfileSummary({ polisData, productType }: { polisData: PolisData; productType: ProductType }) {
  type Field = { label: string; value: string; filled: boolean };

  const getFields = (): Field[] => {
    const f = (label: string, val: string | undefined | null) => ({
      label,
      value: val || "",
      filled: !!val && val !== "0" && val !== "\u{20AC} 0",
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
          Jouw profiel \u{2014} {filledCount}/{fields.length} ingevuld
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
function OverstapModal({ alt, polisData, productType, huidigeMaand, onClose }: {
  alt: Alternative & { besparingJaar: number };
  polisData: PolisData;
  productType: ProductType;
  huidigeMaand: number;
  onClose: () => void;
}) {
  const handleGoDoor = () => {
    window.open(alt.url, "_blank", "noopener,noreferrer");
    onClose();
  };

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

  const steps = [
    { label: "Bereken premie", desc: `Bereken je exacte premie bij ${alt.naam}` },
    { label: "Sluit online af", desc: `Kies dekking en rond de aanvraag af` },
    { label: "Opzegging geregeld", desc: `${alt.naam} zegt je huidige verzekering op` },
    { label: "Nieuwe polis actief", desc: "Je nieuwe polis gaat direct in" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] max-w-[520px] w-full overflow-hidden overflow-y-auto max-h-[90vh] animate-fadeUp"
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
              <h3 className="text-[18px] font-bold text-bw-deep">Overstappen naar {alt.naam}</h3>
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
            <div className="bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] rounded-xl px-4 py-4 mb-5 border border-[#BBF7D0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-[#166534]">Jouw besparing</span>
                <span className="text-[22px] font-bold text-bw-green">&euro; {alt.besparingJaar}/jaar</span>
              </div>
              {/* Savings bar */}
              <div className="h-2 bg-[#BBF7D0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-bw-green rounded-full transition-all"
                  style={{ width: `${Math.min(100, (alt.besparingJaar / (huidigeMaand * 12)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-[#166534]">
                <span>&euro; {alt.premie.toFixed(2)}/mnd bij {alt.naam}</span>
                <span>&euro; {huidigeMaand.toFixed(2)}/mnd nu</span>
              </div>
            </div>
          )}

          {/* Overstap steps */}
          <div className="mb-5">
            <div className="text-[12px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-3">
              Hoe werkt overstappen?
            </div>
            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-bw-green text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="w-px h-6 bg-[#D1FAE5]" />}
                  </div>
                  <div className="pb-3">
                    <div className="text-[13px] font-semibold text-bw-deep">{step.label}</div>
                    <div className="text-[12px] text-bw-text-mid">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile fields to take along */}
          {tipFields.length > 0 && (
            <div className="mb-5">
              <div className="text-[12px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">
                Neem deze gegevens mee
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {tipFields.map((f) => (
                  <div key={f.label} className="flex justify-between text-[12px]">
                    <span className="text-bw-text-mid">{f.label}</span>
                    <span className="font-semibold text-bw-deep">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust elements */}
          <div className="flex items-center gap-4 mb-5 py-2.5 px-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[11px] text-bw-text-mid flex-wrap">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
              14 dagen bedenktijd
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Geen dubbele dekking
            </span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              Direct online
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={handleGoDoor}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white border-none cursor-pointer hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)] transition-all"
          >
            Bereken premie bij {alt.naam} <ArrowRightIcon className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-bw-text-light text-center mt-3">
            Dezelfde prijs als rechtstreeks \u{2014} wij ontvangen een vergoeding van de verzekeraar.
          </p>
        </div>
      </div>
    </div>
  );
}
