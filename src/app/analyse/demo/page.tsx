"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDemoPolisData } from "@/lib/demo-data";
import { anonymize } from "@/lib/anonymizer"; // kept for save functionality
import { getAlternativesFallback } from "@/lib/market-data";
import { polisToScraperInput } from "@/lib/polis-to-input";
import { CheckIcon, ArrowRightIcon, StarIcon, LockIcon, SaveIcon, ShieldIcon, PulseDot } from "@/components/icons";
import type { AnonResult, Alternative, PolisData } from "@/lib/types";
import type { ProductType } from "@/lib/scrapers/base";

const VALID_PRODUCTS: ProductType[] = ["inboedel", "opstal", "aansprakelijkheid", "reis"];

const PRODUCT_LABELS: Record<ProductType, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
};

const LIVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LIVE_SCRAPERS === "true";

const analyzeSteps = [
  { step: 1, label: "PDF uitlezen", desc: "Polisgegevens worden geëxtraheerd" },
  { step: 2, label: "Anonimisering", desc: "Persoonsgegevens worden verwijderd" },
  { step: 3, label: LIVE_ENABLED ? "Live premies ophalen" : "Premies berekenen", desc: LIVE_ENABLED ? "Live premies ophalen bij verzekeraars..." : "Exacte premie per verzekeraar berekend" },
  { step: 4, label: "Resultaten klaar", desc: "Betere opties gevonden!" },
];

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
  const sourceParam = searchParams.get("source"); // "upload" or null
  const productType: ProductType = productParam && VALID_PRODUCTS.includes(productParam) ? productParam : "inboedel";

  const [animStep, setAnimStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [anonData, setAnonData] = useState<AnonResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>(getAlternativesFallback(productType));
  const [dataSource, setDataSource] = useState<"demo" | "calculated" | "upload" | "live">("demo");

  // Get polis data: from sessionStorage (upload) or demo data
  const [polisData, setPolisData] = useState<PolisData>(() => getDemoPolisData(productType));

  useEffect(() => {
    // If source=upload, try to load from sessionStorage
    if (sourceParam === "upload") {
      try {
        const stored = sessionStorage.getItem("bw-upload-polis");
        if (stored) {
          const parsed = JSON.parse(stored) as PolisData;
          setPolisData(parsed);
          setDataSource("upload");
          // Clean up sessionStorage
          sessionStorage.removeItem("bw-upload-polis");
          sessionStorage.removeItem("bw-upload-product");
        }
      } catch {
        // Fall through to demo data
      }
    }
  }, [sourceParam]);

  const huidigeMaand = polisData.maandpremie;
  const huidigeJaar = polisData.jaarpremie;

  // Sorteer op besparing (= huidig - nieuw), hoogste eerst
  const sortedAlts = [...alternatives]
    .map((alt) => ({
      ...alt,
      besparingMaand: +(huidigeMaand - alt.premie).toFixed(2),
      besparingJaar: +((huidigeMaand - alt.premie) * 12).toFixed(0),
    }))
    .sort((a, b) => b.besparingJaar - a.besparingJaar);

  const besteSaving = sortedAlts[0];
  const heeftBesparing = besteSaving && besteSaving.besparingJaar > 0;

  useEffect(() => {
    const anon = anonymize(polisData);
    setAnonData(anon);

    // Start live scraping with profile
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
      .catch(() => {
        // Keep hardcoded fallback
      });

    // Animation runs while scrapers work
    const timers = [
      setTimeout(() => setAnimStep(1), 600),
      setTimeout(() => setAnimStep(2), 1800),
      setTimeout(() => setAnimStep(3), LIVE_ENABLED ? 4000 : 3200),
    ];

    // Show results after both: minimum animation time AND scrape response
    // Live scrapers need more time (~15s), calculated scrapers are fast (~4.2s)
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
    <div className="max-w-[860px] mx-auto px-6 py-10 pb-20">

      {/* ── HERO: je bespaart exact X ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-md text-[13px] font-bold mb-3">
          <CheckIcon className="w-3.5 h-3.5" /> Analyse compleet
        </div>
        {heeftBesparing ? (
          <>
            <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
              Bespaar <span className="text-bw-green">€ {besteSaving.besparingJaar}</span> per jaar
            </h2>
            <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
              Je betaalt nu <strong className="text-bw-red">€ {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              Bij {besteSaving.naam} betaal je <strong className="text-bw-green">€ {besteSaving.premie.toFixed(2)}/mnd</strong>.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-[clamp(28px,3.2vw,40px)] font-bold text-bw-deep mb-2">
              Je zit al <span className="text-bw-green">goed</span>!
            </h2>
            <p className="text-[15px] text-bw-text-mid max-w-[480px] mx-auto">
              Je betaalt <strong className="text-bw-green">€ {huidigeMaand.toFixed(2)}/mnd</strong> bij {polisData.verzekeraar}.
              Geen van de {sortedAlts.length} vergeleken verzekeraars is goedkoper.
            </p>
          </>
        )}
      </div>

      {/* ── HUIDIGE POLIS ── */}
      <div className={`rounded-xl px-5 py-3.5 mb-6 flex items-center justify-between flex-wrap gap-3 border ${
        heeftBesparing
          ? "bg-bw-red-bg border-[#FECACA]"
          : "bg-[#F0FDF4] border-[#BBF7D0]"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
            heeftBesparing ? "bg-[#FECACA]" : "bg-[#BBF7D0]"
          }`}>📋</div>
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
          <div className={`text-xl font-bold ${heeftBesparing ? "text-bw-red" : "text-bw-green"}`}>€ {huidigeMaand.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
          <div className={`text-[11px] ${heeftBesparing ? "text-[#B91C1C]" : "text-[#166534]"}`}>€ {huidigeJaar.toFixed(2)}/jaar · {polisData.dekking}</div>
        </div>
      </div>

      {/* ── ALTERNATIEVEN ── */}
      <div className="flex flex-col gap-3">
        {sortedAlts.map((alt, i) => (
          <div
            key={alt.id}
            className={`bg-white rounded-2xl overflow-hidden transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)] ${
              i === 0 && heeftBesparing ? "border-2 border-bw-green shadow-[0_4px_20px_rgba(22,163,74,0.08)]" : "border border-bw-border"
            }`}
          >
            {/* Aanbeveling banner voor #1 — alleen bij echte besparing */}
            {i === 0 && heeftBesparing && (
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
                  <div className={`text-[22px] font-bold leading-tight ${alt.besparingJaar > 0 ? "text-bw-green" : "text-bw-text-mid"}`}>€ {alt.premie.toFixed(2)}<span className="text-xs font-semibold">/mnd</span></div>
                  {alt.besparingJaar > 0 ? (
                    <div className="text-[12px] font-semibold text-bw-green-strong">
                      € {alt.besparingMaand.toFixed(2)}/mnd goedkoper = <strong>€ {alt.besparingJaar}/jaar</strong>
                    </div>
                  ) : (
                    <div className="text-[12px] font-semibold text-bw-text-light">
                      € {Math.abs(alt.besparingMaand).toFixed(2)}/mnd duurder
                    </div>
                  )}
                </div>

                {/* Rechts: CTA knop */}
                <a
                  href={alt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold text-white no-underline whitespace-nowrap transition-all hover:-translate-y-px ${
                    i === 0 && heeftBesparing
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
          Polisdetails bekijken
        </summary>
        <div className="border-t border-bw-border px-5 py-4">
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
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-bw-bg text-[12px]">
                  <span className="text-bw-text-mid">{k}</span>
                  <span className="font-semibold text-bw-deep">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* ── DATA SOURCE ── */}
      <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border ${
        dataSource === "live"
          ? "bg-[#F0FDF4] border-[#BBF7D0]"
          : dataSource === "calculated"
          ? "bg-[#EFF6FF] border-[#BFDBFE]"
          : dataSource === "upload"
          ? "bg-[#F0FDF4] border-[#BBF7D0]"
          : "bg-[#FFF7ED] border-[#FED7AA]"
      }`}>
        <span className={`text-[11px] ${
          dataSource === "live"
            ? "text-[#166534]"
            : dataSource === "calculated"
            ? "text-[#1D4ED8]"
            : dataSource === "upload"
            ? "text-[#166534]"
            : "text-[#C2410C]"
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
          <strong className="text-bw-text-mid">Provisie-disclosure:</strong> Bij afsluiting via BespaarWacht ontvangen wij een vergoeding van de verzekeraar. Dit kost jou niets extra. Premies zijn berekend op basis van je profiel (feb 2026).
        </p>
      </div>
    </div>
  );
}
