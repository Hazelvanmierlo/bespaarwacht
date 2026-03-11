"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '14155238886';
import type { EnergieData, ParseResult } from "@/lib/energie/pdf-parser";
import type { ApparaatDetectie } from "@/lib/energie/apparaat-detectie";
import { detecteerApparaten } from "@/lib/energie/apparaat-detectie";
import { leveranciers, berekenJaarkosten } from "@/lib/energie/leveranciers";
import { genereerTips } from "@/lib/energie/tips-generator";
import UploadZone from "@/components/energie/UploadZone";
import ExtractedData from "@/components/energie/ExtractedData";
import ProfielDetectie from "@/components/energie/ProfielDetectie";
import Vergelijking from "@/components/energie/Vergelijking";
import AdviesPanel from "@/components/energie/AdviesPanel";
import CountUp from "@/components/energie/CountUp";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

type Phase = "upload" | "results";

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
          setEnergieData(data);
          setApparaten(detecteerApparaten(data));
          setPhase("results");
          sessionStorage.removeItem("bw-upload-energie");
        } catch { /* ignore parse errors */ }
      }
    }
  }, [searchParams]);

  const handleParsed = useCallback((results: ParseResult[]) => {
    if (results.length === 0) return;
    // Use the best quality result (or merge later)
    const best = results.reduce((a, b) => {
      const scoreMap = { goed: 3, redelijk: 2, beperkt: 1 };
      return scoreMap[a.data.kwaliteit] >= scoreMap[b.data.kwaliteit] ? a : b;
    });
    setEnergieData(best.data);
    setApparaten(detecteerApparaten(best.data));
    setPhase("results");
  }, []);

  const handleDataUpdate = useCallback((updated: EnergieData) => {
    setEnergieData(updated);
    setApparaten(detecteerApparaten(updated));
  }, []);

  const handleToggle = useCallback(
    (key: keyof ApparaatDetectie) => {
      if (!apparaten) return;
      setApparaten((prev) => {
        if (!prev) return prev;
        const current = prev[key];
        const toggled =
          current === "zeker" || current === "waarschijnlijk"
            ? "onwaarschijnlijk" as const
            : "zeker" as const;
        return { ...prev, [key]: toggled };
      });
    },
    [apparaten],
  );

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
      {/* HERO */}
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

          {phase === "upload" && (
            <div className="max-w-[600px] mx-auto animate-fadeUp">
              <UploadZone onParsed={handleParsed} />
            </div>
          )}
        </div>
      </section>

      {/* RESULTS */}
      {phase === "results" && energieData && apparaten && (
        <section className="py-12 px-6 bg-bw-bg">
          <div className="max-w-[1140px] mx-auto">
            {/* Besparing banner */}
            {maxBesparing > 0 && (
              <div className="bg-bw-green-bg border border-[rgba(22,163,74,0.2)] rounded-2xl p-6 mb-8 flex items-center gap-6 flex-wrap animate-fadeUp">
                <div className="w-14 h-14 rounded-xl bg-bw-green text-white flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-bw-text-mid mb-0.5">Je kunt tot</p>
                  <p className="font-heading text-3xl font-bold text-bw-green-strong">
                    <CountUp end={maxBesparing} prefix="€" /> <span className="text-lg font-semibold text-bw-text-mid">/jaar besparen</span>
                  </p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-bw-text-mid">
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-bw-green text-white flex items-center justify-center">
                      <CheckIcon className="w-2 h-2" />
                    </div>
                    Gratis vergelijken
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-bw-green text-white flex items-center justify-center">
                      <CheckIcon className="w-2 h-2" />
                    </div>
                    Onafhankelijk advies
                  </div>
                </div>
              </div>
            )}

            {/* 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6">
              {/* Left column */}
              <div className="space-y-6">
                <div className="animate-fadeUp" style={{ animationDelay: "0.1s" }}>
                  <ExtractedData data={energieData} onUpdate={handleDataUpdate} />
                </div>
                <div className="animate-fadeUp" style={{ animationDelay: "0.2s" }}>
                  <Vergelijking
                    resultaten={vergelijking}
                    huidigeLeverancier={energieData.leverancier}
                    affiliateUrls={affiliateUrls}
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="animate-fadeUp" style={{ animationDelay: "0.15s" }}>
                  <ProfielDetectie apparaten={apparaten} onToggle={handleToggle} />
                </div>
                <div className="animate-fadeUp" style={{ animationDelay: "0.25s" }}>
                  <AdviesPanel tips={tips} />
                </div>
              </div>
            </div>

            {/* Upload meer */}
            <div className="mt-8 text-center animate-fadeUp" style={{ animationDelay: "0.3s" }}>
              <button
                onClick={() => setPhase("upload")}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-blue border border-bw-border hover:border-bw-blue hover:bg-bw-blue-light transition-all cursor-pointer"
              >
                Nieuw bestand uploaden <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
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
                { icon: "📄", title: "Upload PDF", desc: "Sleep je jaaroverzicht of energierekening in het uploadvak." },
                { icon: "🔍", title: "Automatische analyse", desc: "Wij lezen je verbruik uit en vergelijken met 11 leveranciers." },
                { icon: "💡", title: "Persoonlijk advies", desc: "Ontvang tips op maat, gebaseerd op jouw situatie." },
              ].map((step) => (
                <div key={step.title} className="bg-white rounded-2xl border border-bw-border p-6 text-center">
                  <span className="text-3xl mb-3 block">{step.icon}</span>
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
            href={`https://wa.me/${WA_NUMBER}?text=Hoi`}
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
