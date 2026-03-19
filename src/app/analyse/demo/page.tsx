"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDemoPolisData } from "@/lib/demo-data";
import { anonymize } from "@/lib/anonymizer";
import { getAlternativesFallback } from "@/lib/market-data";
import { polisToScraperInput } from "@/lib/polis-to-input";
import { VERZEKERAAR_USP } from "@/lib/verzekeraar-meta";
import { CheckIcon, ArrowRightIcon, StarIcon, LockIcon, SaveIcon, ShieldIcon, PulseDot, XIcon, Home, Building2, ShieldCheck, Plane } from "@/components/icons";
import type { AnonResult, Alternative, PolisData } from "@/lib/types";
import type { ProductType } from "@/lib/scrapers/base";
import StepperBar from "@/components/StepperBar";
import { calculateSwitchingAdvice } from "@/lib/switching-advice";

const VERZEKERING_FLOW_STEPS = [
  { label: "Gegevens" },
  { label: "Vergelijking" },
  { label: "Overstappen" },
];

const VALID_PRODUCTS: ProductType[] = ["inboedel", "opstal", "aansprakelijkheid", "reis"];

const PRODUCT_LABELS: Record<ProductType, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
};

const PRODUCT_ICONS: Record<ProductType, React.ReactNode> = {
  inboedel: <Home className="w-5 h-5" />,
  opstal: <Building2 className="w-5 h-5" />,
  aansprakelijkheid: <ShieldCheck className="w-5 h-5" />,
  reis: <Plane className="w-5 h-5" />,
};

const LIVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LIVE_SCRAPERS === "true";

const analyzeSteps = [
  { step: 1, label: "Je polis wordt uitgelezen", desc: "Dekking, premie, eigen risico en voorwaarden worden herkend" },
  { step: 2, label: "Je gegevens worden beschermd", desc: "Naam, adres en IBAN worden versleuteld — de AI ziet ze nooit" },
  { step: 3, label: "10+ verzekeraars vergeleken", desc: "Centraal Beheer, FBTO, ASR, Allianz, Interpolis en meer" },
  { step: 4, label: "Klaar!", desc: "Je persoonlijke vergelijking is gereed" },
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

/* Badge labels for top 3 */
const TOP_BADGES = [
  { label: "Beste keuze", bg: "bg-bw-green", text: "text-white" },
  { label: "Goed alternatief", bg: "bg-bw-deep", text: "text-white" },
  { label: "Ook interessant", bg: "bg-[#6B7280]", text: "text-white" },
];

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
  const top3 = filteredAndSorted.slice(0, 3);
  const overige = filteredAndSorted.slice(3);

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
      setTimeout(() => setAnimStep(1), 500),
      setTimeout(() => setAnimStep(2), 1500),
      setTimeout(() => setAnimStep(3), LIVE_ENABLED ? 4000 : 2800),
      setTimeout(() => setAnimStep(4), LIVE_ENABLED ? 13000 : 4200),
    ];

    const minDelay = new Promise((r) => setTimeout(r, LIVE_ENABLED ? 15000 : 5200));
    Promise.all([scrapePromise, minDelay]).then(() => {
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

  // Timer: count seconds elapsed (must be before any conditional returns)
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (showResults) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [showResults]);

  // === LOADING ANIMATION ===
  if (!showResults) {
    // Traffic light colors based on step
    const lightColor = animStep >= 4 ? "green" : animStep >= 3 ? "green" : animStep >= 2 ? "yellow" : "red";
    const agentMood = animStep >= 4 ? "thumbsup" : animStep >= 3 ? "walking" : animStep >= 2 ? "ready" : "waiting";

    // Trust messages that rotate — conversational, specific, builds confidence
    const trustMessages = [
      { text: "Je persoonsgegevens verlaten nooit onze beveiligde EU-server" },
      { text: "We checken nu Centraal Beheer, FBTO, Allianz, ASR en meer..." },
      { text: "Versleuteld met bankniveau-encryptie (AES-256)" },
      { text: "De AI ziet nooit je naam, adres of IBAN — alleen geanonimiseerde data" },
      { text: "Interpolis, InShared, Nationale-Nederlanden worden vergeleken..." },
      { text: "Je originele document wordt direct na verwerking verwijderd" },
      { text: "We kijken naar premie, dekking, eigen risico \u00e9n voorwaarden" },
      { text: "100% onafhankelijk — wij worden niet betaald door een verzekeraar" },
      { text: "OHRA, Ditzo, Univé, Aegon — alle grote namen worden gecheckt" },
      { text: "Dagelijks monitoren we of jouw premie nog de scherpste is" },
      { text: "Al 1.200+ Nederlanders vergelijken hun polis via ons" },
      { text: "Zelfde dekking, lagere premie? Wij vinden het voor je" },
    ];
    const currentTrust = trustMessages[Math.floor(elapsed / 2) % trustMessages.length];

    return (
      <>
      <StepperBar steps={VERZEKERING_FLOW_STEPS} currentStep={0} />
      <div className="max-w-[520px] mx-auto px-6 py-12 sm:py-16">
        <h2 className="font-heading text-[24px] sm:text-[28px] font-bold text-bw-deep text-center mb-2">
          {animStep >= 4
            ? "Klaar! Je resultaat wordt geladen"
            : animStep >= 3
            ? "Bijna klaar..."
            : `${PRODUCT_LABELS[productType]} wordt geanalyseerd`
          }
        </h2>
        <p className="text-[14px] text-bw-text-mid text-center mb-2">
          {animStep >= 4
            ? "Je persoonlijke top 3 verschijnt zo"
            : animStep >= 3
            ? "Centraal Beheer, FBTO, ASR, Allianz... we checken ze allemaal"
            : animStep >= 2
            ? "Je naam, adres en IBAN worden versleuteld opgeslagen"
            : "We lezen je dekking, premie en voorwaarden uit"
          }
        </p>

        {/* Progress bar + timer */}
        <div className="max-w-[280px] mx-auto mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-bw-text-mid">
              {animStep >= 4 ? "100%" : animStep >= 3 ? "75%" : animStep >= 2 ? "50%" : animStep >= 1 ? "25%" : "0%"}
            </span>
            <span className="text-[11px] text-bw-text-light flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              {elapsed}s
            </span>
          </div>
          <div className="h-2 bg-bw-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-bw-blue to-bw-green rounded-full transition-all duration-700 ease-out"
              style={{ width: animStep >= 4 ? "100%" : animStep >= 3 ? "75%" : animStep >= 2 ? "50%" : animStep >= 1 ? "25%" : "2%" }}
            />
          </div>
        </div>

        {/* Agent + Traffic Light Scene */}
        <div className="flex items-end justify-center gap-6 sm:gap-10 mb-10 h-[180px] relative">
          {/* Traffic light */}
          <div className="flex flex-col items-center">
            <div className="w-[52px] bg-[#1E293B] rounded-xl p-2 flex flex-col gap-2 shadow-lg">
              <div className={`w-9 h-9 rounded-full transition-all duration-700 ${lightColor === "red" ? "bg-[#EF4444] shadow-[0_0_16px_rgba(239,68,68,0.6)]" : "bg-[#7F1D1D]/30"}`} />
              <div className={`w-9 h-9 rounded-full transition-all duration-700 ${lightColor === "yellow" ? "bg-[#EAB308] shadow-[0_0_16px_rgba(234,179,8,0.6)]" : "bg-[#713F12]/30"}`} />
              <div className={`w-9 h-9 rounded-full transition-all duration-700 ${lightColor === "green" ? "bg-[#22C55E] shadow-[0_0_16px_rgba(34,197,94,0.6)]" : "bg-[#14532D]/30"}`} />
            </div>
            <div className="w-3 h-12 bg-[#64748B] rounded-b" />
          </div>

          {/* Agent character */}
          <div className={`relative transition-all duration-700 ${agentMood === "walking" || agentMood === "thumbsup" ? "translate-x-4" : ""}`}>
            {/* Body */}
            <div className="relative">
              {/* Head */}
              <div className="w-14 h-14 rounded-full bg-[#FBBF24] mx-auto relative z-10">
                {/* Eyes */}
                <div className="absolute top-[18px] left-[14px] flex gap-[10px]">
                  <div className={`w-2.5 h-2.5 rounded-full bg-[#1E293B] transition-all duration-500 ${agentMood === "waiting" ? "animate-[blink_3s_ease-in-out_infinite]" : ""}`} />
                  <div className={`w-2.5 h-2.5 rounded-full bg-[#1E293B] transition-all duration-500 ${agentMood === "waiting" ? "animate-[blink_3s_ease-in-out_infinite]" : ""}`} />
                </div>
                {/* Mouth */}
                <div className={`absolute bottom-[12px] left-1/2 -translate-x-1/2 transition-all duration-500 ${
                  agentMood === "thumbsup" ? "w-5 h-2.5 rounded-b-full bg-[#1E293B]" :
                  agentMood === "walking" || agentMood === "ready" ? "w-3 h-1.5 rounded-full bg-[#1E293B]" :
                  "w-4 h-0.5 bg-[#1E293B] rounded"
                }`} />
              </div>
              {/* Hat/badge */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-5 bg-bw-blue rounded-t-lg z-20 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              {/* Suit body */}
              <div className="w-16 h-20 bg-bw-deep rounded-b-2xl mx-auto -mt-2 relative">
                {/* Tie */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[10px] border-l-transparent border-r-transparent border-t-bw-blue" />
                {/* Arms */}
                <div className={`absolute -left-3 top-2 w-3 h-14 bg-bw-deep rounded-full origin-top transition-all duration-500 ${
                  agentMood === "thumbsup" ? "-rotate-45" :
                  agentMood === "walking" ? "rotate-12" :
                  "rotate-6"
                }`}>
                  {agentMood === "thumbsup" && (
                    <div className="absolute -top-1 -left-2 text-lg">&#128077;</div>
                  )}
                </div>
                <div className={`absolute -right-3 top-2 w-3 h-14 bg-bw-deep rounded-full origin-top transition-all duration-500 ${
                  agentMood === "walking" ? "-rotate-12" :
                  agentMood === "thumbsup" ? "rotate-6" :
                  "-rotate-6"
                }`}>
                  {/* Briefcase in right hand */}
                  {agentMood !== "thumbsup" && (
                    <div className="absolute bottom-0 -right-2 w-6 h-5 bg-[#92400E] rounded-sm border-t-2 border-[#78350F]" />
                  )}
                </div>
              </div>
              {/* Legs */}
              <div className="flex justify-center gap-1 -mt-1">
                <div className={`w-3 h-8 bg-[#334155] rounded-b transition-all duration-300 ${agentMood === "walking" ? "origin-top -rotate-12" : ""}`} />
                <div className={`w-3 h-8 bg-[#334155] rounded-b transition-all duration-300 ${agentMood === "walking" ? "origin-top rotate-12" : ""}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Rotating trust message */}
        <div className="flex items-center justify-center gap-2 mb-5 px-4 py-2.5 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0] mx-auto max-w-[400px]">
          <svg className="w-4 h-4 text-bw-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
          </svg>
          <span className="text-[12px] text-[#166534] font-medium">{currentTrust.text}</span>
        </div>

        {/* Steps below */}
        <div className="space-y-0">
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
      </div>
      </>
    );
  }

  // === RESULTS ===
  return (
    <>
    <StepperBar steps={VERZEKERING_FLOW_STEPS} currentStep={overstapModal ? 2 : 1} />
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">

      {/* ── HERO ── */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-md text-[13px] font-bold mb-3">
          <CheckIcon className="w-3.5 h-3.5" /> Analyse compleet
        </div>
        {heeftBesparing ? (
          <>
            <h2 className="font-heading text-[clamp(26px,3vw,38px)] font-bold text-bw-deep mb-2">
              Bespaar <span className="text-bw-green">&euro; {besteSaving.besparingJaar}</span> per jaar
            </h2>
            <p className="text-[14px] sm:text-[15px] text-bw-text-mid max-w-[520px] mx-auto">
              Je betaalt nu <strong className="text-bw-red">&euro; {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              {" "}Bij <strong className="text-bw-green">{besteSaving.naam}</strong> betaal je slechts <strong className="text-bw-green">&euro; {besteSaving.premie.toFixed(2)}/mnd</strong>.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-[clamp(26px,3vw,38px)] font-bold text-bw-deep mb-2">
              Je zit al <span className="text-bw-green">goed</span>!
            </h2>
            <p className="text-[14px] sm:text-[15px] text-bw-text-mid max-w-[520px] mx-auto">
              Je betaalt <strong className="text-bw-green">&euro; {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              Geen van de {filteredAndSorted.length} vergeleken verzekeraars is goedkoper.
            </p>
          </>
        )}
      </div>

      {/* ── TRUST BAR ── */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 py-2.5 px-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex-wrap">
        <TrustItem icon={<ShieldCheckSVG />} label="Onafhankelijk" />
        <TrustItem icon={<UsersSVG />} label={`${filteredAndSorted.length} verzekeraars`} />
        <TrustItem icon={<LockIcon className="w-3.5 h-3.5" />} label="Privacygarantie" />
        <TrustItem icon={<ThumbsUpSVG />} label="Gratis & vrijblijvend" />
      </div>

      {/* ── MOBILE FILTER TOGGLE ── */}
      <div className="lg:hidden mb-4 flex gap-2">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
          Filters {showMobileFilters ? "verbergen" : "tonen"}
        </button>
        <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-bw-blue bg-white border border-bw-border hover:bg-bw-bg transition-colors">
          Mijn gegevens
        </Link>
      </div>

      {/* ── 2-COLUMN LAYOUT: SIDEBAR + RESULTS ── */}
      <div className="flex gap-6 items-start">

        {/* ── SIDEBAR (desktop always, mobile toggle) ── */}
        <aside className={`w-[280px] shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
          <div className="sticky top-6 space-y-4">

            {/* Profile summary */}
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-bw-deep">Mijn gegevens</span>
                <Link href="/upload" className="text-[11px] font-semibold text-bw-blue hover:underline">wijzig</Link>
              </div>
              <div className="space-y-2 text-[12px]">
                {polisData.verzekeraar && (
                  <div className="flex justify-between">
                    <span className="text-bw-text-mid">Verzekeraar</span>
                    <span className="font-semibold text-bw-deep">{polisData.verzekeraar}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-bw-text-mid">Premie</span>
                  <span className="font-semibold text-bw-red">&euro; {huidigeMaand.toFixed(2)}/mnd</span>
                </div>
                {polisData.postcode && (
                  <div className="flex justify-between">
                    <span className="text-bw-text-mid">Postcode</span>
                    <span className="font-semibold text-bw-deep">{polisData.postcode}</span>
                  </div>
                )}
                {polisData.woning && (productType === "inboedel" || productType === "opstal") && (
                  <div className="flex justify-between">
                    <span className="text-bw-text-mid">Woning</span>
                    <span className="font-semibold text-bw-deep">{polisData.woning}</span>
                  </div>
                )}
                {polisData.gezin && (
                  <div className="flex justify-between">
                    <span className="text-bw-text-mid">Gezin</span>
                    <span className="font-semibold text-bw-deep">{polisData.gezin}</span>
                  </div>
                )}
                {polisData.dekking && (
                  <div className="flex justify-between">
                    <span className="text-bw-text-mid">Dekking</span>
                    <span className="font-semibold text-bw-deep">{polisData.dekking}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sort options */}
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <div className="text-[13px] font-bold text-bw-deep mb-3">Sorteer op</div>
              <div className="space-y-1.5">
                {([
                  { key: "besparing" as SortMode, label: "Hoogste besparing" },
                  { key: "premie" as SortMode, label: "Laagste premie" },
                  { key: "beoordeling" as SortMode, label: "Beste beoordeling" },
                ] as const).map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer py-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      sortMode === opt.key ? "border-bw-green" : "border-[#CBD5E1]"
                    }`}>
                      {sortMode === opt.key && <div className="w-2 h-2 rounded-full bg-bw-green" />}
                    </div>
                    <button
                      onClick={() => setSortMode(opt.key)}
                      className={`text-[13px] font-[inherit] bg-transparent border-none cursor-pointer ${
                        sortMode === opt.key ? "font-semibold text-bw-deep" : "text-bw-text-mid"
                      }`}
                    >
                      {opt.label}
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Eigen risico filter */}
            {showERFilter && (
              <div className="bg-white rounded-xl border border-bw-border p-4">
                <div className="text-[13px] font-bold text-bw-deep mb-3">Eigen risico</div>
                <div className="space-y-1.5">
                  {([
                    { key: "alle", label: "Alle" },
                    { key: "0", label: "\u{20AC} 0" },
                    { key: "150", label: "\u{2264} \u{20AC} 150" },
                  ]).map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer py-1">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        eigenRisicoFilter === opt.key ? "border-bw-green bg-bw-green" : "border-[#CBD5E1] bg-white"
                      }`}>
                        {eigenRisicoFilter === opt.key && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <button
                        onClick={() => setEigenRisicoFilter(opt.key)}
                        className={`text-[13px] font-[inherit] bg-transparent border-none cursor-pointer ${
                          eigenRisicoFilter === opt.key ? "font-semibold text-bw-deep" : "text-bw-text-mid"
                        }`}
                      >
                        {opt.label}
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoring CTA in sidebar */}
            <button
              onClick={handleSave}
              disabled={saved}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold bg-bw-deep text-white border-none cursor-pointer font-[inherit] hover:bg-bw-navy transition-colors disabled:opacity-50"
            >
              <ShieldIcon className="w-4 h-4" />
              {saved ? <><PulseDot /> Monitoring actief</> : <>24/7 monitoring</>}
            </button>
          </div>
        </aside>

        {/* ── MAIN RESULTS AREA ── */}
        <div className="flex-1 min-w-0">

          {/* ── HUIDIGE POLIS (compact bar) ── */}
          <div className={`rounded-xl px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-2 border ${
            heeftBesparing
              ? "bg-bw-red-bg border-[#FECACA]"
              : "bg-[#F0FDF4] border-[#BBF7D0]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                heeftBesparing ? "bg-[#FECACA]" : "bg-[#BBF7D0]"
              }`}>{PRODUCT_ICONS[productType]}</div>
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-[0.5px] ${
                  heeftBesparing ? "text-bw-red" : "text-bw-green-strong"
                }`}>Huidige polis{!heeftBesparing && " \u{00B7} Beste prijs"}</div>
                <div className={`text-[14px] font-bold ${
                  heeftBesparing ? "text-[#991B1B]" : "text-[#166534]"
                }`}>{polisData.verzekeraar}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[20px] font-bold ${heeftBesparing ? "text-bw-red" : "text-bw-green"}`}>&euro; {huidigeMaand.toFixed(2)}<span className="text-[11px] font-semibold">/mnd</span></div>
              <div className={`text-[11px] ${heeftBesparing ? "text-[#B91C1C]" : "text-[#166534]"}`}>{polisData.dekking} &middot; {polisData.eigenRisico}</div>
            </div>
          </div>

          {/* ── SORT TABS (mobile + desktop inline) ── */}
          <div className="flex items-center gap-1 mb-4 bg-[#F1F5F9] rounded-xl p-1 lg:hidden">
            {([
              { key: "besparing" as SortMode, label: "Besparing" },
              { key: "premie" as SortMode, label: "Goedkoopst" },
              { key: "beoordeling" as SortMode, label: "Beoordeling" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold cursor-pointer border-none font-[inherit] transition-all ${
                  sortMode === opt.key ? "bg-white text-bw-deep shadow-sm" : "bg-transparent text-bw-text-mid"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── TOP 3: "Jouw persoonlijke top 3" ── */}
          {top3.length > 0 && (
            <>
              <h3 className="text-[18px] sm:text-[20px] font-bold text-bw-deep mb-3">Jouw persoonlijke top {Math.min(3, top3.length)}</h3>

              {/* Top 3 cards — on desktop show side-by-side if 3, on mobile stack */}
              <div className={`grid gap-3 mb-6 ${top3.length >= 3 ? "grid-cols-1 md:grid-cols-3" : top3.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                {top3.map((alt, i) => {
                  const badge = TOP_BADGES[i];
                  const coverageItems = getCoverageItems(productType, alt.dekking, polisData.gezin);
                  const coveredCount = coverageItems.filter(c => c.covered).length;

                  return (
                    <div
                      key={alt.id}
                      className={`bg-white rounded-2xl overflow-hidden flex flex-col ${
                        i === 0
                          ? "border-2 border-bw-green shadow-[0_4px_24px_rgba(22,163,74,0.10)]"
                          : "border border-bw-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                      } transition-all`}
                    >
                      {/* Badge */}
                      <div className={`${badge.bg} ${badge.text} px-4 py-2 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold">{badge.label}</span>
                        </div>
                        {alt.besparingJaar > 0 && (
                          <span className="text-[12px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                            &minus;&euro; {alt.besparingJaar}/jr
                          </span>
                        )}
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        {/* Logo + name */}
                        <div className="flex items-center gap-3 mb-3">
                          <InsLogo naam={alt.naam} kleur={alt.kleur} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold text-bw-deep truncate">{alt.naam}</div>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} />)}
                              <span className="text-[10px] text-bw-text-light ml-1">({alt.beoordelingBron})</span>
                            </div>
                          </div>
                        </div>

                        {/* Price — big */}
                        <div className="text-right mb-3">
                          <div className="text-[11px] text-bw-text-light">Per maand</div>
                          <div className={`font-heading text-[28px] font-bold leading-tight ${
                            alt.besparingJaar > 0 ? "text-bw-green" : "text-bw-deep"
                          }`}>
                            &euro; {alt.premie.toFixed(2).replace(".", ",")}<span className="text-[13px] font-semibold text-bw-text-light align-top ml-0.5">/mnd</span>
                          </div>
                          {alt.besparingJaar > 0 && (
                            <div className="text-[12px] font-semibold text-bw-green-strong">
                              &euro; {alt.besparingMaand.toFixed(2)}/mnd goedkoper
                            </div>
                          )}
                          <div className="text-[11px] text-bw-text-light mt-1">
                            {polisData.dekking} &middot; {polisData.eigenRisico || "€ 0"} eigen risico
                          </div>
                        </div>

                        {/* Details chips */}
                        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
                          <span className="px-2 py-0.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-bw-text-mid">
                            {alt.dekking}
                          </span>
                          <span className="px-2 py-0.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-bw-text-mid">
                            ER: {alt.eigenRisico}
                          </span>
                          <span className="px-2 py-0.5 bg-[#F0FDF4] rounded border border-[#BBF7D0] text-[#166534]">
                            {coveredCount}/{coverageItems.length} gedekt
                          </span>
                        </div>

                        {/* Spacer to push CTA to bottom */}
                        <div className="flex-1" />

                        {/* CTA: "Kies deze" */}
                        <button
                          onClick={() => setOverstapModal({ ...alt })}
                          className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-bold cursor-pointer border-none font-[inherit] transition-all hover:-translate-y-px ${
                            i === 0
                              ? "bg-bw-green text-white hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)]"
                              : "bg-bw-deep text-white hover:bg-bw-navy hover:shadow-[0_4px_16px_rgba(15,33,55,0.2)]"
                          }`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                          Kies deze
                        </button>

                        {/* Meer informatie toggle */}
                        <button
                          onClick={() => setExpandedCard(expandedCard === alt.id ? null : alt.id)}
                          className="mt-2 w-full inline-flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-bw-blue cursor-pointer bg-transparent border-none font-[inherit] hover:underline"
                        >
                          {expandedCard === alt.id ? "\u2212 Minder informatie" : "+ Meer informatie"}
                        </button>

                        {/* Expanded info */}
                        {expandedCard === alt.id && (
                          <CardDetails
                            alt={alt}
                            productType={productType}
                            polisData={polisData}
                            huidigeMaand={huidigeMaand}
                            coverageItems={coverageItems}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── ALLE VERZEKERAARS (list view, includes top 3) ── */}
          {filteredAndSorted.length > 0 && (
            <>
              <h3 className="text-[16px] font-bold text-bw-deep mb-3">
                Alle {filteredAndSorted.length} verzekeraars
              </h3>

              <div className="flex flex-col gap-2.5">
                {filteredAndSorted.map((alt, i) => {
                  const rank = i + 1;
                  const isExpanded = expandedCard === alt.id;
                  const coverageItems = getCoverageItems(productType, alt.dekking, polisData.gezin);

                  return (
                    <div
                      key={alt.id}
                      className="bg-white rounded-xl border border-bw-border overflow-hidden hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Rank number */}
                        <div className="w-6 h-6 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[11px] font-bold text-bw-text-mid shrink-0">
                          {rank}
                        </div>

                        {/* Logo */}
                        <InsLogo naam={alt.naam} kleur={alt.kleur} size="sm" />

                        {/* Name + details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold text-bw-deep">{alt.naam}</span>
                            {alt.highlight && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${
                                alt.highlight === "Beste uit de Test" ? "bg-bw-blue-light text-[#1D4ED8]" :
                                alt.highlight === "Laagste premie" ? "bg-[#FFF7ED] text-[#C2410C]" :
                                "bg-[#F3F4F6] text-bw-text-mid"
                              }`}>{alt.highlight}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-bw-text-light mt-0.5">
                            <span>{alt.dekking}</span>
                            <span>&middot;</span>
                            <span>ER: {alt.eigenRisico}</span>
                            <span>&middot;</span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} />)}
                            </div>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <div className={`text-[18px] font-bold ${
                            alt.besparingJaar > 0 ? "text-bw-green" : "text-bw-text-mid"
                          }`}>
                            &euro; {alt.premie.toFixed(2)}<span className="text-[10px] font-semibold">/mnd</span>
                          </div>
                          {alt.besparingJaar > 0 ? (
                            <div className="text-[11px] font-semibold text-bw-green-strong">&minus;&euro; {alt.besparingJaar}/jr</div>
                          ) : alt.besparingJaar < 0 ? (
                            <div className="text-[11px] text-bw-text-light">+&euro; {Math.abs(alt.besparingJaar)}/jr</div>
                          ) : null}
                          <div className="text-[11px] text-bw-text-light mt-1">
                            {polisData.dekking} &middot; {polisData.eigenRisico || "€ 0"} eigen risico
                          </div>
                        </div>

                        {/* CTA */}
                        <button
                          onClick={() => setOverstapModal({ ...alt })}
                          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-bw-green text-white cursor-pointer border-none font-[inherit] hover:bg-bw-green-strong transition-all shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                          Kies deze
                        </button>
                      </div>

                      {/* Mobile CTA + expand row */}
                      <div className="flex items-center border-t border-[#F1F5F9] sm:border-t-0">
                        <button
                          onClick={() => setOverstapModal({ ...alt })}
                          className="sm:hidden flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-bold text-bw-green cursor-pointer bg-transparent border-none font-[inherit] border-r border-[#F1F5F9]"
                        >
                          Kies deze
                        </button>
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : alt.id)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2.5 text-[12px] font-semibold text-bw-blue cursor-pointer bg-transparent border-none font-[inherit] hover:underline sm:border-t sm:border-[#F1F5F9] sm:w-full"
                        >
                          {isExpanded ? "\u2212 Minder informatie" : "+ Meer informatie"}
                        </button>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <CardDetails
                            alt={alt}
                            productType={productType}
                            polisData={polisData}
                            huidigeMaand={huidigeMaand}
                            coverageItems={coverageItems}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {filteredAndSorted.length === 0 && (
            <div className="text-center py-10 text-bw-text-mid">
              <p className="text-[15px]">Geen resultaten met deze filters.</p>
              <button onClick={() => setEigenRisicoFilter("alle")} className="mt-2 text-bw-blue font-semibold text-[13px] cursor-pointer bg-transparent border-none">
                Filters resetten
              </button>
            </div>
          )}

          {/* ── UPGRADE TIP ── */}
          {(polisData.dekking.toLowerCase().includes("basis") ||
            (polisData.dekking.toLowerCase().includes("uitgebreid") && !polisData.dekking.toLowerCase().includes("extra"))) && (() => {
            const nextLevel = polisData.dekking.toLowerCase().includes("basis") ? "Uitgebreid" : "Extra Uitgebreid";
            const upgradeAlt = alternatives
              .filter(a => a.dekking === nextLevel)
              .sort((a, b) => a.premie - b.premie)[0];
            const currentCheapest = filteredAndSorted[0];
            if (!upgradeAlt || !currentCheapest) return null;
            const extraPerMonth = upgradeAlt.premie - currentCheapest.premie;
            if (extraPerMonth > 5 || extraPerMonth <= 0) return null;
            return (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-4">
                <div className="flex items-start gap-2">
                  <span className="text-[16px]">&#128161;</span>
                  <div>
                    <div className="text-[13px] font-bold text-bw-deep mb-0.5">Tip van je agent</div>
                    <div className="text-[13px] text-bw-text-mid">
                      Voor &euro;{extraPerMonth.toFixed(2)}/mnd meer krijg je {nextLevel} dekking bij {upgradeAlt.naam}.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── SWITCHING ADVICE ── */}
          {heeftBesparing && besteSaving && (() => {
            const advice = calculateSwitchingAdvice(
              polisData.opzegtermijn,
              polisData.verlengingsdatum,
              polisData.ingangsdatum,
              polisData.verzekeraar,
              besteSaving.naam,
              besteSaving.url,
            );
            return (
              <div className="bg-white rounded-xl border border-bw-border p-5 mt-6">
                <h3 className="text-[16px] font-bold text-bw-deep mb-4">
                  Overstappen naar {besteSaving.naam}
                </h3>
                {advice.waarschuwing && (
                  <div className="bg-bw-orange-bg border border-[#FED7AA] rounded-lg px-3 py-2 mb-4 text-[13px] text-[#9A3412] font-medium">
                    &#9888; {advice.waarschuwing}
                  </div>
                )}
                <div className="space-y-4">
                  {advice.stappen.map((stap) => (
                    <div key={stap.nummer} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-bw-green text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                        {stap.nummer}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-bw-deep">{stap.titel}</div>
                        <div className="text-[13px] text-bw-text-mid">{stap.beschrijving}</div>
                        {stap.nummer === 1 && besteSaving.url && (
                          <a
                            href={besteSaving.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-bw-green text-white hover:bg-bw-green-strong transition-colors no-underline"
                          >
                            Bekijk bij {besteSaving.naam} &rarr;
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── WHATSAPP MONITORING CTA ── */}
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mt-4 text-center">
            <div className="text-[14px] font-semibold text-bw-deep mb-1">Premie blijven bewaken?</div>
            <div className="text-[13px] text-bw-text-mid mb-3">
              We checken dagelijks of er een betere deal is en sturen je een WhatsApp.
            </div>
            <a
              href="https://wa.me/14155238886?text=Hoi%2C%20ik%20wil%20mijn%20premie%20laten%20bewaken"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors no-underline"
            >
              &#128172; Start WhatsApp-bewaking
            </a>
          </div>

          {/* ── SAVE + MONITORING (mobile) ── */}
          <div className="mt-6 flex gap-3 flex-wrap lg:hidden">
            <button
              onClick={handleSave}
              disabled={saved}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-bold bg-bw-deep text-white border-none cursor-pointer font-[inherit] hover:bg-bw-navy transition-colors disabled:opacity-50 min-w-[200px]"
            >
              <ShieldIcon className="w-4 h-4" />
              {saved ? <><PulseDot /> Monitoring actief</> : <>Activeer 24/7 monitoring</>}
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
          <div className="flex items-center gap-2.5 mt-5 px-4 py-2.5 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
            <LockIcon />
            <span className="text-xs text-bw-green-dark">
              <strong>Geen persoonsgegevens opgeslagen.</strong> Alleen geanonimiseerde data.{" "}
              <Link href="/privacy" className="underline">Privacy &rarr;</Link>
            </span>
          </div>

          {/* ── DATA SOURCE ── */}
          <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border ${
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
                <><strong>Live premies</strong> &mdash; Echte premies opgehaald bij {alternatives.length} verzekeraars.</>
              ) : dataSource === "calculated" ? (
                <><strong>Berekende premies</strong> &mdash; Op basis van markttarieven berekend voor {alternatives.length} verzekeraars.</>
              ) : dataSource === "upload" ? (
                <><strong>Upload analyse</strong> &mdash; Premies berekend op basis van je eigen polisgegevens.</>
              ) : (
                <><strong>Demo premies</strong> &mdash; Voorbeelddata. Live scraping niet beschikbaar.</>
              )}
            </span>
          </div>

          {/* ── DISCLAIMER ── */}
          <div className="mt-3 p-3 bg-bw-bg rounded-lg border-l-[3px] border-bw-border">
            <p className="text-[11px] text-bw-text-light leading-relaxed">
              <strong className="text-bw-text-mid">Provisie-disclosure:</strong> Bij afsluiting via DeVerzekeringsAgent ontvangen wij een vergoeding van de verzekeraar. Dit kost jou niets extra.
            </p>
          </div>
        </div>
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
    </>
  );
}

/* ─── INSURER LOGO ─── */
function InsLogo({ naam, kleur, size = "sm" }: { naam: string; kleur: string; size?: "sm" | "lg" }) {
  const sizeClasses = size === "lg"
    ? "w-12 h-12 rounded-xl text-[14px]"
    : "w-9 h-9 rounded-lg text-[11px]";

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center text-white font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)]`}
      style={{ backgroundColor: kleur || "#94A3B8" }}
    >
      {naam.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ─── CARD EXPANDED DETAILS ─── */
function CardDetails({ alt, productType, polisData, huidigeMaand, coverageItems }: {
  alt: Alternative & { besparingMaand: number; besparingJaar: number };
  productType: ProductType;
  polisData: PolisData;
  huidigeMaand: number;
  coverageItems: { label: string; covered: boolean }[];
}) {
  const usp = VERZEKERAAR_USP[alt.id] || "";

  return (
    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
      <div className="space-y-4">
        {/* Coverage details */}
        <div>
          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Dekking</div>
          <div className="space-y-1.5">
            {coverageItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1 border-b border-[#F8FAFC]">
                <span className="text-[12px] text-bw-text-mid">{item.label}</span>
                {item.covered ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bw-green-strong">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Gedekt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    Niet gedekt
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* About + price comparison */}
        <div>
          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Over {alt.naam}</div>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} className="w-3.5 h-3.5" />)}
            <span className="text-[11px] font-semibold text-bw-deep ml-1">{alt.beoordelingBron}</span>
          </div>
          {usp && <p className="text-[12px] text-bw-text-mid leading-relaxed mb-3">{usp}</p>}

          {/* Price comparison mini-table */}
          <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-1.5">
            <div className="text-[10px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Prijsvergelijking</div>
            <div className="flex justify-between text-[12px]">
              <span className="text-bw-text-mid">Huidig ({polisData.verzekeraar})</span>
              <span className="font-semibold text-bw-red">&euro; {huidigeMaand.toFixed(2)}/mnd</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-bw-text-mid">{alt.naam}</span>
              <span className="font-semibold text-bw-green">&euro; {alt.premie.toFixed(2)}/mnd</span>
            </div>
            {alt.besparingJaar > 0 && (
              <div className="flex justify-between text-[12px] pt-1.5 border-t border-[#E2E8F0]">
                <span className="font-semibold text-bw-deep">Besparing per jaar</span>
                <span className="font-bold text-bw-green">&euro; {alt.besparingJaar}</span>
              </div>
            )}
          </div>
        </div>
      </div>
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
    { label: "Ga naar verzekeraar", desc: `Bekijk het aanbod bij ${alt.naam}` },
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
            <InsLogo naam={alt.naam} kleur={alt.kleur} size="lg" />
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

          {/* Profile fields */}
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
            Overstappen naar {alt.naam} <ArrowRightIcon className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-bw-text-light text-center mt-3">
            Dezelfde prijs als rechtstreeks &mdash; wij ontvangen een vergoeding van de verzekeraar.
          </p>
        </div>
      </div>
    </div>
  );
}
