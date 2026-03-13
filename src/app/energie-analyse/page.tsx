"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '14155238886';
const WA_JOIN = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_CODE || '';
const WA_TEXT = WA_JOIN || 'Hoi';
import type { EnergieData, ParseResult } from "@/lib/energie/pdf-parser";
import type { ApparaatDetectie } from "@/lib/energie/apparaat-detectie";
import { detecteerApparaten } from "@/lib/energie/apparaat-detectie";
import { leveranciers, berekenJaarkosten } from "@/lib/energie/leveranciers";
import { genereerTips } from "@/lib/energie/tips-generator";
import UploadZone from "@/components/energie/UploadZone";
import Vergelijking from "@/components/energie/Vergelijking";
import CountUp from "@/components/energie/CountUp";
import { ArrowRightIcon, CheckIcon, FileText, Search, Lightbulb, Zap, LockIcon } from "@/components/icons";
import StepperBar from "@/components/StepperBar";

const ENERGIE_FLOW_STEPS = [
  { label: "Gegevens" },
  { label: "Vergelijking" },
  { label: "Overstappen" },
];

type Phase = "upload" | "analyzing" | "results";

const analyzeSteps = [
  { step: 1, label: "PDF uitlezen", desc: "Energiegegevens worden geëxtraheerd" },
  { step: 2, label: "Anonimisering", desc: "Persoonsgegevens worden verwijderd" },
  { step: 3, label: "Tarieven vergelijken", desc: "Alle leveranciers worden doorgerekend" },
  { step: 4, label: "Resultaten klaar", desc: "Goedkopere opties gevonden!" },
];

export default function EnergieAnalysePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-16 text-center text-bw-text-mid">Laden...</div>}>
      <EnergieAnalyseContent />
    </Suspense>
  );
}

function EnergieAnalyseContent() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("upload");
  const [energieData, setEnergieData] = useState<EnergieData | null>(null);
  const [apparaten, setApparaten] = useState<ApparaatDetectie | null>(null);
  const [affiliateUrls, setAffiliateUrls] = useState<Record<string, string>>({});
  const [animStep, setAnimStep] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const startAnalyzing = useCallback((data: EnergieData) => {
    setEnergieData(data);
    setApparaten(detecteerApparaten(data));
    setPhase("analyzing");
    setAnimStep(0);
    // Step-by-step animation
    setTimeout(() => setAnimStep(1), 500);
    setTimeout(() => setAnimStep(2), 1600);
    setTimeout(() => setAnimStep(3), 2800);
    setTimeout(() => {
      setAnimStep(4);
      setTimeout(() => setPhase("results"), 600);
    }, 4000);
  }, []);

  useEffect(() => {
    fetch("/api/daisycon/urls")
      .then(r => r.json())
      .then(setAffiliateUrls)
      .catch(() => {});
  }, []);

  // Check for uploaded data from the universal upload page
  useEffect(() => {
    if (searchParams.get("source") === "upload") {
      const stored = sessionStorage.getItem("bw-upload-energie");
      if (stored) {
        try {
          const data = JSON.parse(stored) as EnergieData;
          sessionStorage.removeItem("bw-upload-energie");
          startAnalyzing(data);
        } catch { /* ignore parse errors */ }
      }
    }
  }, [searchParams, startAnalyzing]);

  const handleParsed = useCallback((results: ParseResult[]) => {
    if (results.length === 0) return;
    // Use the best quality result (or merge later)
    const best = results.reduce((a, b) => {
      const scoreMap = { goed: 3, redelijk: 2, beperkt: 1 };
      return scoreMap[a.data.kwaliteit] >= scoreMap[b.data.kwaliteit] ? a : b;
    });
    startAnalyzing(best.data);
  }, [startAnalyzing]);

  /* ── Derived calculations ── */
  const vergelijking = useMemo(() => {
    if (!energieData) return [];
    const dal = energieData.verbruikKwhDal ?? 1500;
    const piek = energieData.verbruikKwhPiek ?? 1000;
    const gas = energieData.verbruikGasM3;
    const teruglevering = energieData.terugleveringKwh;

    return leveranciers.map((lev) =>
      berekenJaarkosten(lev, dal, piek, gas, teruglevering),
    );
  }, [energieData]);

  const tips = useMemo(() => {
    if (!energieData || !apparaten) return [];
    return genereerTips(energieData, apparaten);
  }, [energieData, apparaten]);

  const maxBesparing = useMemo(() => {
    if (vergelijking.length < 2) return 0;
    const sorted = [...vergelijking].sort((a, b) => a.totaalJaar - b.totaalJaar);
    const huidige = energieData?.leverancier
      ? vergelijking.find(
          (r) => r.leverancier.naam.toLowerCase().includes(energieData.leverancier!.toLowerCase()),
        )
      : sorted[sorted.length - 1];
    if (!huidige) return sorted[sorted.length - 1].totaalJaar - sorted[0].totaalJaar;
    return Math.max(0, huidige.totaalJaar - sorted[0].totaalJaar);
  }, [vergelijking, energieData]);

  return (
    <>
      {/* STEPPER BAR */}
      <StepperBar steps={ENERGIE_FLOW_STEPS} currentStep={phase === "upload" ? 0 : phase === "analyzing" ? 0 : 1} />

      {/* HERO — only on upload phase */}
      {phase === "upload" && (
        <section className="py-16 md:py-20 px-6 bg-white">
          <div className="max-w-[1140px] mx-auto text-center">
            <div className="inline-flex items-center gap-[5px] bg-bw-green-bg text-bw-green-strong px-[11px] py-1 rounded-md text-[12.5px] font-semibold mb-4">
              ✓ 100% privé — verwerkt in je browser
            </div>
            <h1 className="font-heading text-[clamp(28px,3.2vw,42px)] leading-[1.15] font-bold text-bw-deep tracking-[-0.6px] mb-3 max-w-[700px] mx-auto">
              Analyseer je energiekosten en vind de{" "}
              <span className="text-bw-green">goedkoopste leverancier</span>
            </h1>
            <p className="text-[16px] leading-relaxed text-bw-text-mid max-w-[520px] mx-auto mb-8">
              Upload je jaaroverzicht of energierekening. Wij vergelijken direct alle leveranciers en geven persoonlijk advies.
            </p>

            <div className="max-w-[600px] mx-auto animate-fadeUp">
              <UploadZone onParsed={handleParsed} />
            </div>
          </div>
        </section>
      )}

      {/* ANALYZING ANIMATION */}
      {phase === "analyzing" && (
        <div className="max-w-[520px] mx-auto px-6 py-20">
          <h2 className="font-heading text-[28px] font-bold text-bw-deep text-center mb-10">
            Energiekosten worden geanalyseerd...
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
      )}

      {/* RESULTS — same structure as /analyse/demo */}
      {phase === "results" && energieData && apparaten && (
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">

          {/* ── HERO ── */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-md text-[13px] font-bold mb-3">
              <CheckIcon className="w-3.5 h-3.5" /> Analyse compleet
            </div>
            {maxBesparing > 0 ? (
              <>
                <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
                  Bespaar <span className="text-bw-green"><CountUp end={maxBesparing} prefix="€" /></span> per jaar
                </h2>
                <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
                  {energieData.leverancier
                    ? <>Je betaalt nu{energieData.kostenTotaalJaar ? <> <strong className="text-bw-red">&euro;{Math.round(energieData.kostenTotaalJaar)}/jaar</strong></> : null} bij {energieData.leverancier}. Er zijn goedkopere opties.</>
                    : <>Er zijn leveranciers die <strong className="text-bw-green">&euro;{Math.round(maxBesparing / 12)}/maand goedkoper</strong> zijn voor jouw verbruik.</>
                  }
                </p>
              </>
            ) : (
              <>
                <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
                  Je zit al <span className="text-bw-green">goed</span>!
                </h2>
                <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
                  {energieData.leverancier ? `${energieData.leverancier} is al de goedkoopste optie voor jouw verbruik.` : "Je huidige leverancier biedt de beste prijs."}
                </p>
              </>
            )}
          </div>

          {/* ── TRUST BAR ── */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 py-3 px-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-bw-text-mid">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
              Onafhankelijk
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-bw-text-mid">
              <Zap className="w-3.5 h-3.5 text-bw-green" />
              {vergelijking.length} leveranciers
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-bw-text-mid">
              <LockIcon className="w-3.5 h-3.5 text-bw-green" />
              Privacygarantie
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-bw-text-mid">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 9V5a3 3 0 00-6 0v4" /><rect x="2" y="9" width="20" height="13" rx="2" /><circle cx="12" cy="16" r="1" /></svg>
              Gratis &amp; vrijblijvend
            </span>
          </div>

          {/* ── MOBILE FILTER TOGGLE ── */}
          <div className="lg:hidden mb-4 flex gap-2">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 21V14M4 10V3M12 21V12M12 8V3M20 21V16M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
              Keuzes {showMobileFilters ? "verbergen" : "aanscherpen"}
            </button>
          </div>

          {/* ── HUIDIGE SITUATIE (compact inline like polis) ── */}
          <div className={`rounded-xl px-5 py-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${
            maxBesparing > 0
              ? "bg-bw-red-bg border-[#FECACA]"
              : "bg-[#F0FDF4] border-[#BBF7D0]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                maxBesparing > 0 ? "bg-[#FECACA]" : "bg-[#BBF7D0]"
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-[0.5px] ${
                  maxBesparing > 0 ? "text-bw-red" : "text-bw-green-strong"
                }`}>Huidige leverancier{!maxBesparing && " \u00B7 Beste prijs"}</div>
                <div className={`text-[15px] font-bold ${
                  maxBesparing > 0 ? "text-[#991B1B]" : "text-[#166534]"
                }`}>{energieData.leverancier || "Onbekend"} &mdash; {energieData.contractType || "Variabel"}</div>
              </div>
            </div>
            <div className="text-right">
              {energieData.kostenTotaalJaar ? (
                <>
                  <div className={`text-xl font-bold ${maxBesparing > 0 ? "text-bw-red" : "text-bw-green"}`}>
                    &euro;{Math.round(energieData.kostenTotaalJaar / 12)}<span className="text-xs font-semibold">/mnd</span>
                  </div>
                  <div className={`text-[11px] ${maxBesparing > 0 ? "text-[#B91C1C]" : "text-[#166534]"}`}>
                    &euro;{Math.round(energieData.kostenTotaalJaar)}/jaar &middot; {(energieData.verbruikKwhTotaal || 0).toLocaleString("nl-NL")} kWh{energieData.verbruikGasM3 ? ` + ${energieData.verbruikGasM3.toLocaleString("nl-NL")} m\u00B3` : ""}
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-bw-text-mid">
                  {(energieData.verbruikKwhTotaal || 0).toLocaleString("nl-NL")} kWh{energieData.verbruikGasM3 ? ` + ${energieData.verbruikGasM3.toLocaleString("nl-NL")} m\u00B3` : ""}/jaar
                </div>
              )}
            </div>
          </div>

          {/* ── PERSONALIZED TIPS (collapsed) ── */}
          {tips.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#9A3412]">
                <strong>Tip:</strong> {tips[0].titel} — {tips[0].beschrijving}
                {tips.length > 1 && <span className="text-[#C2410C]/60"> (+{tips.length - 1} meer)</span>}
              </div>
            </div>
          )}

          {/* ── 2-COLUMN LAYOUT: SIDEBAR + RESULTS ── */}
          <div className="flex gap-6 items-start">

            {/* ── SIDEBAR (desktop always, mobile toggle) ── */}
            <aside className={`w-[280px] shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
              <div className="sticky top-14 space-y-4">

                {/* Profile summary — Keuzes aanscherpen */}
                <div className="bg-white rounded-xl border border-bw-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-bold text-bw-deep">Keuzes aanscherpen</span>
                    <button
                      onClick={() => { setPhase("upload"); setEnergieData(null); setApparaten(null); }}
                      className="text-[11px] font-semibold text-bw-blue hover:underline bg-transparent border-none cursor-pointer font-[inherit]"
                    >
                      wijzig
                    </button>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    {/* Verbruik */}
                    <div className="border-b border-[#F1F5F9] pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-bw-text-mid">Verbruik</span>
                      </div>
                      <div className="text-[12px] text-bw-deep font-semibold">
                        Stroom: {(energieData.verbruikKwhTotaal || ((energieData.verbruikKwhDal || 0) + (energieData.verbruikKwhPiek || 0))).toLocaleString("nl-NL")} kWh
                      </div>
                      {energieData.verbruikKwhDal != null && energieData.verbruikKwhPiek != null && (
                        <div className="text-[11px] text-bw-text-light mt-0.5">
                          Dal: {energieData.verbruikKwhDal.toLocaleString("nl-NL")} · Normaal: {energieData.verbruikKwhPiek.toLocaleString("nl-NL")}
                        </div>
                      )}
                      {energieData.verbruikGasM3 != null && energieData.verbruikGasM3 > 0 && (
                        <div className="text-[12px] text-bw-deep font-semibold mt-1">
                          Gas: {energieData.verbruikGasM3.toLocaleString("nl-NL")} m&sup3;
                        </div>
                      )}
                      {energieData.terugleveringKwh != null && energieData.terugleveringKwh > 0 && (
                        <div className="text-[12px] text-bw-green font-semibold mt-1">
                          Teruglevering: {energieData.terugleveringKwh.toLocaleString("nl-NL")} kWh
                        </div>
                      )}
                    </div>
                    {/* Leverancier */}
                    {energieData.leverancier && (
                      <div className="flex justify-between">
                        <span className="text-bw-text-mid">Leverancier</span>
                        <span className="font-semibold text-bw-deep">{energieData.leverancier}</span>
                      </div>
                    )}
                    {/* Contract type */}
                    {energieData.contractType && (
                      <div className="flex justify-between">
                        <span className="text-bw-text-mid">Contract</span>
                        <span className="font-semibold text-bw-deep">{energieData.contractType}</span>
                      </div>
                    )}
                    {/* Einddatum */}
                    {energieData.einddatum && (
                      <div className="flex justify-between">
                        <span className="text-bw-text-mid">Einddatum</span>
                        <span className="font-semibold text-bw-deep">{energieData.einddatum}</span>
                      </div>
                    )}
                    {/* Huidige kosten */}
                    {energieData.kostenTotaalJaar != null && energieData.kostenTotaalJaar > 0 && (
                      <div className="flex justify-between">
                        <span className="text-bw-text-mid">Kosten</span>
                        <span className="font-semibold text-bw-red">&euro;{Math.round(energieData.kostenTotaalJaar)}/jaar</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 24/7 monitoring CTA */}
                <button className="w-full bg-bw-green text-white rounded-xl py-3.5 px-4 text-[13px] font-bold text-center hover:bg-bw-green-dark transition-colors border-none cursor-pointer font-[inherit]">
                  <Zap className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  24/7 monitoring
                </button>
              </div>
            </aside>

            {/* ── MAIN RESULTS ── */}
            <div className="min-w-0 flex-1">
              <Vergelijking
                resultaten={vergelijking}
                huidigeLeverancier={energieData.leverancier}
                affiliateUrls={affiliateUrls}
              />
            </div>
          </div>

          {/* Upload meer */}
          <div className="mt-8 text-center">
            <button
              onClick={() => { setPhase("upload"); setEnergieData(null); setApparaten(null); }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-blue border border-bw-border hover:border-bw-blue hover:bg-bw-blue-light transition-all cursor-pointer"
            >
              Nieuw bestand uploaden <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom CTA (upload phase only) */}
      {phase === "upload" && (
        <section className="py-16 px-6 bg-bw-bg">
          <div className="max-w-[700px] mx-auto text-center">
            <h2 className="font-heading text-[clamp(20px,2.4vw,28px)] font-bold text-bw-deep mb-3">
              Hoe werkt het?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                { icon: <FileText className="w-7 h-7 text-bw-blue" />, title: "Upload PDF", desc: "Sleep je jaaroverzicht of energierekening in het uploadvak." },
                { icon: <Search className="w-7 h-7 text-bw-blue" />, title: "Automatische analyse", desc: "Wij lezen je verbruik uit en vergelijken met 11 leveranciers." },
                { icon: <Lightbulb className="w-7 h-7 text-bw-green" />, title: "Persoonlijk advies", desc: "Ontvang tips op maat, gebaseerd op jouw situatie." },
              ].map((step) => (
                <div key={step.title} className="bg-white rounded-2xl border border-bw-border p-6 text-center">
                  <span className="mb-3 block">{step.icon}</span>
                  <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">{step.title}</h3>
                  <p className="text-[13px] text-bw-text-mid leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WhatsApp CTA */}
      <section className="py-12 px-6">
        <div className="max-w-[700px] mx-auto bg-bw-green-bg rounded-2xl p-8 text-center">
          <h2 className="font-heading text-[clamp(20px,2.4vw,26px)] font-bold text-bw-deep mb-2">
            Liever via WhatsApp?
          </h2>
          <p className="text-[15px] text-bw-text-mid mb-6 max-w-lg mx-auto leading-relaxed">
            Stuur je energierekening en ontvang binnen 10 seconden persoonlijk advies.
            We vergelijken 18 leveranciers met 30+ contracten. Geen account nodig.
            Overstappen? Alleen IBAN + e-mail. Wij regelen de rest.
          </p>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 px-7 rounded-xl text-[15px] transition-all hover:scale-105 shadow-lg no-underline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Start op WhatsApp
          </a>
          <p className="text-xs text-bw-text-light mt-3">
            Je data verlaat nooit het gesprek - 100% gratis
          </p>
        </div>
      </section>
    </>
  );
}
