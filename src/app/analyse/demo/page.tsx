"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { demoPolisData } from "@/lib/demo-data";
import { anonymize } from "@/lib/anonymizer";
import { ALTERNATIVES } from "@/lib/market-data";
import { CheckIcon, ArrowRightIcon, StarIcon, LockIcon, SaveIcon, ShieldIcon, PulseDot } from "@/components/icons";
import type { AnonResult } from "@/lib/types";

const analyzeSteps = [
  { step: 1, label: "PDF uitlezen", desc: "Polisgegevens worden geëxtraheerd" },
  { step: 2, label: "Anonimisering", desc: "Persoonsgegevens worden verwijderd" },
  { step: 3, label: "Premies berekenen", desc: "Exacte premie per verzekeraar berekend" },
  { step: 4, label: "Resultaten klaar", desc: "Betere opties gevonden!" },
];

export default function AnalyseDemoPage() {
  const [animStep, setAnimStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [anonData, setAnonData] = useState<AnonResult | null>(null);
  const [saved, setSaved] = useState(false);

  const polisData = demoPolisData;
  const huidigeMaand = polisData.maandpremie;
  const huidigeJaar = polisData.jaarpremie;

  // Sorteer op besparing (= huidig - nieuw), hoogste eerst
  const sortedAlts = [...ALTERNATIVES]
    .map((alt) => ({
      ...alt,
      besparingMaand: +(huidigeMaand - alt.premie).toFixed(2),
      besparingJaar: +((huidigeMaand - alt.premie) * 12).toFixed(0),
    }))
    .sort((a, b) => b.besparingJaar - a.besparingJaar);

  const besteSaving = sortedAlts[0];

  useEffect(() => {
    const anon = anonymize(polisData);
    setAnonData(anon);

    const timers = [
      setTimeout(() => setAnimStep(1), 600),
      setTimeout(() => setAnimStep(2), 1800),
      setTimeout(() => setAnimStep(3), 3200),
      setTimeout(() => { setAnimStep(4); setShowResults(true); }, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

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
          Polis wordt geanalyseerd...
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
    <div className="max-w-[860px] mx-auto px-6 py-10 pb-20">

      {/* ── HERO: je bespaart exact X ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-md text-[13px] font-bold mb-3">
          <CheckIcon className="w-3.5 h-3.5" /> Analyse compleet
        </div>
        <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
          Bespaar <span className="text-bw-green">€ {besteSaving.besparingJaar}</span> per jaar
        </h2>
        <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
          Je betaalt nu <strong className="text-bw-red">€ {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
          Bij {besteSaving.naam} betaal je <strong className="text-bw-green">€ {besteSaving.premie.toFixed(2)}/mnd</strong>.
        </p>
      </div>

      {/* ── HUIDIGE POLIS ── */}
      <div className="bg-bw-red-bg border border-[#FECACA] rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FECACA] flex items-center justify-center text-lg shrink-0">📋</div>
          <div>
            <div className="text-xs font-bold text-bw-red uppercase tracking-[0.5px]">Huidige polis</div>
            <div className="text-[15px] font-bold text-[#991B1B]">{polisData.verzekeraar} — {polisData.type}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-bw-red">€ {huidigeMaand.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
          <div className="text-[11px] text-[#B91C1C]">€ {huidigeJaar.toFixed(2)}/jaar · {polisData.dekking}</div>
        </div>
      </div>

      {/* ── ALTERNATIEVEN ── */}
      <div className="flex flex-col gap-3">
        {sortedAlts.map((alt, i) => (
          <div
            key={alt.id}
            className={`bg-white rounded-2xl overflow-hidden transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] ${
              i === 0 ? "border-2 border-bw-green shadow-[0_4px_20px_rgba(22,163,74,0.08)]" : "border border-bw-border"
            }`}
          >
            {/* Aanbeveling banner voor #1 */}
            {i === 0 && (
              <div className="bg-bw-green px-5 py-1.5 text-center">
                <span className="text-[13px] font-bold text-white">Aanbeveling — Bespaar € {alt.besparingJaar}/jaar</span>
              </div>
            )}

            <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
              {/* Links: naam + info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[16px] font-bold text-bw-deep">{alt.naam}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    alt.highlight === "Hoogste besparing" ? "bg-bw-green-bg text-bw-green-strong" :
                    alt.highlight === "Beste uit de Test" ? "bg-bw-blue-light text-[#1D4ED8]" :
                    alt.highlight === "Laagste premie" ? "bg-bw-orange-bg text-bw-orange" : "bg-[#F3F4F6] text-bw-text-mid"
                  }`}>{alt.highlight}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-bw-text-mid">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= alt.beoordeling} />)}
                  </div>
                  <span>{alt.beoordelingBron}</span>
                  <span>·</span>
                  <span>{alt.dekking}</span>
                  <span>·</span>
                  <span>ER: {alt.eigenRisico}</span>
                </div>
              </div>

              {/* Midden: prijs + besparing */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[22px] font-bold text-bw-green leading-tight">€ {alt.premie.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
                  <div className="text-[12px] font-semibold text-bw-green-strong">
                    € {alt.besparingMaand.toFixed(2)}/mnd goedkoper = <strong>€ {alt.besparingJaar}/jaar</strong>
                  </div>
                </div>

                {/* Rechts: CTA knop */}
                <a
                  href={alt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold text-white no-underline whitespace-nowrap transition-all hover:-translate-y-px ${
                    i === 0
                      ? "bg-bw-green hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)]"
                      : "bg-bw-deep hover:bg-bw-navy hover:shadow-[0_4px_16px_rgba(15,33,55,0.2)]"
                  }`}
                >
                  Sluit nu af <ArrowRightIcon className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
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

      {/* ── DETAILS (uitklapbaar) ── */}
      <details className="mt-5 bg-white rounded-xl border border-bw-border overflow-hidden">
        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-bw-deep hover:bg-bw-bg transition-colors">
          Polisdetails &amp; anonimisering bekijken
        </summary>
        <div className="border-t border-bw-border px-5 py-4">
          {/* Anonimisering */}
          <h4 className="text-[13px] font-bold text-bw-deep mb-3">Anonimisering</h4>
          <div className="rounded-lg border border-bw-border overflow-hidden mb-5">
            <div className="grid grid-cols-[1.2fr_1.6fr_1.2fr_0.8fr] bg-bw-deep px-4 py-2">
              {["Veld", "Origineel", "Geanonimiseerd", "Status"].map((h) => (
                <span key={h} className="text-[11px] font-bold text-white uppercase tracking-[0.5px]">{h}</span>
              ))}
            </div>
            {anonData?.fields.map((f, i) => (
              <div key={i} className={`grid grid-cols-[1.2fr_1.6fr_1.2fr_0.8fr] px-4 py-2 border-b border-[#F1F5F9] ${i % 2 ? "bg-[#FAFBFC]" : "bg-white"}`}>
                <span className="text-[12px] font-semibold text-bw-deep">{f.veld}</span>
                <span className={`text-[12px] text-bw-text-light ${f.status === "verwijderd" ? "line-through" : ""}`}>{f.origineel}</span>
                <span className={`text-[12px] font-semibold ${
                  f.status === "verwijderd" ? "text-bw-green" : f.status === "deels" ? "text-bw-orange" : "text-bw-blue"
                }`}>{f.anon}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded self-start inline-flex items-center ${
                  f.status === "verwijderd" ? "bg-bw-green-bg text-bw-green" :
                  f.status === "deels" ? "bg-bw-orange-bg text-bw-orange" : "bg-bw-blue-light text-bw-blue"
                }`}>
                  {f.status === "verwijderd" ? "Verwijderd" : f.status === "deels" ? "Deels" : "Bewaard"}
                </span>
              </div>
            ))}
          </div>

          {/* Kerngegevens */}
          <h4 className="text-[13px] font-bold text-bw-deep mb-3">Kerngegevens</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-bw-border p-4">
              <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Polis</div>
              {[
                ["Verzekeraar", polisData.verzekeraar],
                ["Type", polisData.type],
                ["Dekking", polisData.dekking],
                ["Ingangsdatum", polisData.ingangsdatum],
                ["Opzegtermijn", polisData.opzegtermijn],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-bw-bg text-[12px]">
                  <span className="text-bw-text-mid">{k}</span>
                  <span className="font-semibold text-bw-deep">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-bw-border p-4">
              <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Woning</div>
              {[
                ["Type", polisData.woning],
                ["Bouwaard", polisData.bouwaard],
                ["Oppervlakte", polisData.oppervlakte],
                ["Gezin", polisData.gezin],
                ["Regio", polisData.woonplaats],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-bw-bg text-[12px]">
                  <span className="text-bw-text-mid">{k}</span>
                  <span className="font-semibold text-bw-deep">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* ── DISCLAIMER ── */}
      <div className="mt-4 p-3 bg-bw-bg rounded-lg border-l-[3px] border-bw-border">
        <p className="text-[11px] text-bw-text-light leading-relaxed">
          <strong className="text-bw-text-mid">Provisie-disclosure:</strong> Bij afsluiting via BespaarWacht ontvangen wij een vergoeding van de verzekeraar. Dit kost jou niets extra. Premies zijn berekend op basis van je profiel (feb 2026).
        </p>
      </div>
    </div>
  );
}
